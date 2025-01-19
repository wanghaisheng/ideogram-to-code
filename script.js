import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai@0.7.0/dist/index.umd.min.js";

const MODEL_NAME = "gemini-1.5-pro-latest";
const framework = "Regular CSS use flex grid etc";

const apiKeyInput = document.getElementById('apiKey');
const imageUpload = document.getElementById('imageUpload');
const codeButton = document.getElementById('codeButton');
const imageContainer = document.getElementById('imageContainer');
const initialDescriptionContainer = document.getElementById('initialDescription');
const refinedDescriptionContainer = document.getElementById('refinedDescription');
const htmlContainer = document.getElementById('initialHtml');
const refinedHtmlContainer = document.getElementById('refinedHtml');
const downloadLink = document.getElementById('downloadLink');
const loading = document.getElementById('loading');
const errorContainer = document.getElementById('errorContainer');
const successContainer = document.getElementById('successContainer');
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
};

const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];


let uploadedImageFile = null;


imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        uploadedImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imageContainer.innerHTML = `<img src="${e.target.result}" alt="Uploaded Image">`;
        };
        reader.readAsDataURL(file);
        codeButton.disabled = false;
    } else {
       imageContainer.innerHTML = "";
       codeButton.disabled = true;
    }
});


codeButton.addEventListener('click', async () => {
      if (!uploadedImageFile) {
          displayError("Please upload an image first!");
          return;
      }


    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      displayError("Please enter your API key");
      return;
    }

    showLoading();
    clearResponse();

    try {

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig, safetySettings });
        const parts =  [{
            inlineData: {
                data: await readImageAsBase64(uploadedImageFile),
                mimeType: 'image/jpeg'
                }
         }];

        // Generate UI description
        let prompt = "Analyze the provided image and meticulously describe each UI element present. Include details on the element's type (e.g., button, text field, image, icon), color, and text content if any. Provide the approximate bounding box coordinates for each element in the format: [element name (y_min, x_min, y_max, x_max)], where (y_min, x_min) is the top-left corner and (y_max, x_max) is the bottom-right corner of the element's box, all in pixel values. Be accurate and comprehensive in your description and give every relevant element of the UI a name.";
        const initialDescriptionResponse = await model.generateContent([prompt, ...parts]);
        const description = initialDescriptionResponse.response.text();
        initialDescriptionContainer.textContent = description;


        // Refine the description
        let refinePrompt = `Carefully compare the following initial UI description with the provided image. Identify and list all inaccuracies, missing elements, or incorrect bounding box coordinates, and wrong element types that do not match the original image. Also, check the color of the elements and update it if it is wrong. Provide a revised UI description that corrects all identified issues and is fully consistent with the image. Here is the initial description: ${description}`;
       const refinedDescriptionResponse = await model.generateContent([refinePrompt, ...parts]);
       const refinedDescription = refinedDescriptionResponse.response.text();
       refinedDescriptionContainer.textContent = refinedDescription;



        // Generate HTML
       let htmlPrompt = `Based on the following UI description, generate a complete and valid HTML file that accurately recreates the user interface depicted in the provided image. Incorporate ${framework} CSS to style all elements. The HTML needs to be responsive, mobile-first, and should visually match the image as closely as possible, maintaining the original colors and layout, while using only divs and spans. Use the element name from the description and add it to the class of each div or span element. Do not include any comments, explanations or code examples, and ensure that the output is only the HTML code itself, formatted with proper indentation, without the use of \`\`\`html or \`\`\`. Here is the refined description: ${refinedDescription}`;
      const initialHtmlResponse = await model.generateContent([htmlPrompt, ...parts]);
      const initialHtml = initialHtmlResponse.response.text();
      htmlContainer.textContent = initialHtml;


       // Refine HTML
        let refineHtmlPrompt = `Carefully analyze the following HTML code based on the original image, previous description, and make sure the layout matches the image as close as possible. If anything is wrong, provide a refined version of the HTML code with ${framework} CSS that is more accurate, better responsiveness, and better adheres to the original design. Make sure the layout is the same as the image using only divs and spans. Use the element name from the description and add it to the class of each div or span element. Do not include any comments, explanations or code examples, and ensure that the output is only the HTML code itself, formatted with proper indentation, without the use of \`\`\`html or \`\`\`. Here is the initial HTML: ${initialHtml}`;
        const refinedHtmlResponse = await model.generateContent([refineHtmlPrompt, ...parts]);
        const refinedHtml = refinedHtmlResponse.response.text();
         refinedHtmlContainer.textContent = refinedHtml;




          // Create download link
         const blob = new Blob([refinedHtml], { type: 'text/html' });
         const url = URL.createObjectURL(blob);
         downloadLink.href = url;
         downloadLink.style.display = 'inline';
         displaySuccess("HTML file created!");
    } catch (error) {
         console.error('Error:', error);
         displayError(`An error occurred: ${error.message}`);
     } finally {
          hideLoading();
     }
});

async function readImageAsBase64(file) {
   return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
        };
      reader.onerror = (error) => reject(error);
       reader.readAsDataURL(file);
   });
}


function showLoading() {
  loading.style.display = 'block';
}

function hideLoading() {
  loading.style.display = 'none';
}

function clearResponse() {
    initialDescriptionContainer.textContent = "";
    refinedDescriptionContainer.textContent = "";
    htmlContainer.textContent = "";
    refinedHtmlContainer.textContent = "";
    downloadLink.style.display = 'none';
    errorContainer.style.display = 'none';
    successContainer.style.display = 'none';
}

function displayError(errorMessage) {
    errorContainer.textContent = errorMessage;
    errorContainer.style.display = 'block';
}
function displaySuccess(successMessage) {
  successContainer.textContent = successMessage;
  successContainer.style.display = 'block';
}
