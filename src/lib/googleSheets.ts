export interface EmailSubmission {
  id: string;
  email: string;
  submittedAt: string;
  waitlistSpot?: number;
  syncedToSheets?: boolean;
}

/**
 * Fetch spreadsheet metadata to get the first sheet's title
 */
export async function getFirstSheetTitle(accessToken: string, spreadsheetId: string): Promise<string> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch spreadsheet metadata: ${errorText}`);
  }

  const data = await response.json();
  const firstSheet = data.sheets?.[0];
  return firstSheet?.properties?.title || 'Sheet1';
}

/**
 * Create a new Google Spreadsheet for recording email submissions
 */
export async function createSubmissionsSpreadsheet(
  accessToken: string,
  title: string = 'Interview Ready - Email Submissions'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetTitle: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: 'Submissions',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Email Address' } },
                    { userEnteredValue: { stringValue: 'Submission Date' } },
                    { userEnteredValue: { stringValue: 'Waitlist Spot' } },
                    { userEnteredValue: { stringValue: 'Status' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errorData}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
    sheetTitle: 'Submissions',
  };
}

/**
 * Append a list of email submissions to Google Sheets
 */
export async function appendSubmissionsToSheet(
  accessToken: string,
  spreadsheetId: string,
  submissions: EmailSubmission[]
): Promise<boolean> {
  if (submissions.length === 0) return true;

  const sheetTitle = await getFirstSheetTitle(accessToken, spreadsheetId);
  const rows = submissions.map((sub) => [
    sub.email,
    new Date(sub.submittedAt).toLocaleString(),
    sub.waitlistSpot ? `#${sub.waitlistSpot}` : 'N/A',
    'Verified',
  ]);

  const range = `${encodeURIComponent(sheetTitle)}!A:D`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to append rows to Google Sheet: ${errorText}`);
  }

  return true;
}

/**
 * Fetch recorded submissions from Google Sheet
 */
export async function fetchSheetSubmissions(
  accessToken: string,
  spreadsheetId: string
): Promise<Array<{ email: string; date: string; spot: string; status: string }>> {
  const sheetTitle = await getFirstSheetTitle(accessToken, spreadsheetId);
  const range = `${encodeURIComponent(sheetTitle)}!A2:D1000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const values: string[][] = data.values || [];

  return values.map((row) => ({
    email: row[0] || '',
    date: row[1] || '',
    spot: row[2] || '',
    status: row[3] || 'Verified',
  }));
}
