import * as functions from 'firebase-functions';
import admin from 'firebase-admin'; 
import path from 'path';
import os from 'os';
import {promises as fs} from 'fs';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';


// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//

admin.initializeApp();
const bucket = admin.storage().bucket();

export const helloWorld = functions.https.onRequest(async (request, response) => {
    // Download File From a bucket
    const localTemplate = path.join(os.tmpdir(), 'localTemplate.html')
    await bucket.file('madlib.html').download({destination: localTemplate})

    // Read new file from Temporary storage
    const source = await fs.readFile(localTemplate, 'utf8'); 

    // grab data from request.body and create new HTML File
    const madLibInfoSource = request.body;
    const html = handlebars.compile(source)(madLibInfoSource);

    // Create a new reference to a new file and create PDF
    const localPDFFile = path.join(os.tmpdir(), 'localPDFFile.pdf');
    await createPDF(html, localPDFFile);

    // Send file a back in the response PDF
    response.setHeader('Content-disposition', 'attachment; filename=local.pdf');
    response.status(200).sendFile(localPDFFile);

    // delete storage
    response.on('finished', async ()=> {
     await fs.unlink(localTemplate);
     await fs.unlink(localPDFFile);

    })

  return;
});


async function createPDF(html: string, localPDFFile: string){
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage()
  await page.setContent(html);
  const buffer =  await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
        left: '0px',
        top: '0px',
        right: '0px',
        bottom: '0px'
    }
  })
  console.log('got here', localPDFFile);
  return await fs.writeFile(localPDFFile, buffer, {encoding: 'base64'});

}