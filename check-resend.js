

async function sendTest() {
  try {
    console.log('Sending test email...');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@noreply.appinterviewready.top',
        to: 'victorchoogo48@gmail.com',
        subject: 'Test Email',
        html: '<p>This is a test email.</p>'
      })
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

sendTest();
