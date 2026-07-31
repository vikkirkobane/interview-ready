const { Document, Packer, Paragraph, TextRun } = require('docx');

async function testDocxExport() {
  console.log("Starting DOCX generation test...");
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun("Hello World"),
              new TextRun({
                text: "Foo Bar",
                bold: true,
              }),
              new TextRun({
                text: "\tGithub is the best",
                bold: true,
              }),
            ],
          }),
        ],
      }],
    });

    const base64Data = await Packer.toBase64String(doc);
    
    if (base64Data && base64Data.length > 100) {
      console.log("SUCCESS! Base64 DOCX string generated. Length:", base64Data.length);
    } else {
      console.error("FAILED! Output too short or empty.");
    }
  } catch (error) {
    console.error("ERROR generating DOCX:", error);
  }
}

testDocxExport();
