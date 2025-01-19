  f"Carefully compare the following initial UI description (given as a JSON array) with the provided image. Identify and list all inaccuracies, missing elements, incorrect bounding box coordinates, wrong element types, or incorrect descriptions of colors, shapes, gradients, or styles that do not match the original image. Provide a revised and refined JSON array that corrects all identified issues and is fully consistent with the image. The JSON array should follow the same structure as the initial one, including 'type', 'name', 'bounding_box', 'description' and 'style' for each element. Ensure that each element's 'description' is as comprehensive as possible."
 ```

3.  **HTML Generation Prompt (Updated):**

 ```
 f"Based on the provided JSON array description of the UI and image assets, generate a complete and valid HTML file that accurately recreates the user interface depicted in the provided image. Use divs and spans to structure the UI. Generate inline CSS to position and style all the elements as described in the JSON array, using the provided bounding box coordinates and style attributes. For image assets (icons, backgrounds, etc), use the `<img>` tag and use the `description` field as the `alt` attribute.  Also add an example url `https://via.placeholder.com/150` for the `src` attribute. Use the 'name' property as a class for each div. Do not include any comments, explanations or code examples, and ensure that the output is only the HTML code itself, formatted with proper indentation, without the use of \`\`\`html or \`\`\`. Ensure that each alt is not empty or null."
 ```

**Updated JavaScript (`script.js`)**
```javascript
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
      let prompt =  `Analyze the provided image and meticulously describe each UI element present, including all image-based assets (icons, backgrounds, illustrations). For each element, provide the following information:
      -   **type:** (e.g., button, text field, image, icon, background, etc.)
      -   **name:** (a unique name for each element)
      -   **bounding_box:** (y_min, x_min, y_max, x_max) in pixel values
      -   **description:** A detailed textual description of the element, including:
            - shape (e.g., square, circle, rounded rectangle, curved, lines, etc)
            - colors, including gradients if applicable (e.g., background color and foreground color)
            - textures or patterns (if any)
            -  whether it's a flat design or has any 3D effects like glowing, or shadow, etc.
           -  for icons, describe the illustration they contain
           -  for text, describe the font and if there is any style like boldness or italic
           - for background, describe the colors and gradients
      - **style**: A short description of overall visual style (e.g., cartoon, realistic, flat, neon, etc)

     Format your response as a JSON array, where each item represents a UI element and its properties. For images that have gradients, please include all the gradient colors. Be as comprehensive as possible.`;

     const initialDescriptionResponse = await model.generateContent([prompt, ...parts]);
     const description = initialDescriptionResponse.response.text();
     initialDescriptionContainer.textContent = description;


     // Refine the description
      let refinePrompt =  `Carefully compare the following initial UI description (given as a JSON array) with the provided image. Identify and list all inaccuracies, missing elements, incorrect bounding box coordinates, wrong element types, or incorrect descriptions of colors, shapes, gradients, or styles that do not match the original image. Provide a revised and refined JSON array that corrects all identified issues and is fully consistent with the image. The JSON array should follow the same structure as the initial one, including 'type', 'name', 'bounding_box', 'description' and 'style' for each element. Ensure that each element's 'description' is as comprehensive as possible.`;

     const refinedDescriptionResponse = await model.generateContent([refinePrompt, ...parts]);
     const refinedDescription = refinedDescriptionResponse.response.text();
       refinedDescriptionContainer.textContent = refinedDescription;



     // Generate HTML
      let htmlPrompt =   `Based on the provided JSON array description of the UI and image assets, generate a complete and valid HTML file that accurately recreates the user interface depicted in the provided image. Use divs and spans to structure the UI. Generate inline CSS to position and style all the elements as described in the JSON array, using the provided bounding box coordinates and style attributes. For image assets (icons, backgrounds, etc), use the \`<img>\` tag and use the \`description\` field as the \`alt\` attribute.  Also add an example url \`https://via.placeholder.com/150\` for the \`src\` attribute. Use the 'name' property as a class for each div. Do not include any comments, explanations or code examples, and ensure that the output is only the HTML code itself, formatted with proper indentation, without the use of \`\`\`html or \`\`\`. Ensure that each alt is not empty or null.`;
    const initialHtmlResponse = await model.generateContent([htmlPrompt, ...parts]);
     const initialHtml = initialHtmlResponse.response.text();
     htmlContainer.textContent = initialHtml;

     // Refine HTML - NOT NEEDED AS WE ARE ONLY DOING ONE STEP IN IMAGE GENERATION
     // let refineHtmlPrompt = `Validate the following HTML code based on the UI description and image and provide a refined version of the HTML code with ${framework} CSS that improves accuracy, responsiveness, and adherence to the original design. ONLY return the refined HTML code with inline CSS. Avoid using \`\`\`html. and \`\`\` at the end. Here is the initial HTML: ${initialHtml}`;
     // const refinedHtmlResponse = await model.generateContent([refineHtmlPrompt, ...parts]);
     // const refinedHtml = refinedHtmlResponse.response.text();
     refinedHtmlContainer.textContent = initialHtml;

       // Create download link
      const blob = new Blob([initialHtml], { type: 'text/html' });
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
