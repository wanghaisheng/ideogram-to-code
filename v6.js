import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai@0.7.0/dist/index.umd.min.js";

const MODEL_NAME = "gemini-1.5-pro-latest";
const framework = "Regular CSS use flex grid etc";

const apiKeyInput = document.getElementById('apiKey');
const imageUpload = document.getElementById('imageUpload');
const codeButton = document.getElementById('codeButton');
const cutAssetsButton = document.getElementById('cutAssetsButton');
const imageContainer = document.getElementById('imageContainer');
const initialDescriptionContainer = document.getElementById('initialDescription');
const refinedDescriptionContainer = document.getElementById('refinedDescription');
const htmlContainer = document.getElementById('initialHtml');
const refinedHtmlContainer = document.getElementById('refinedHtml');
const htmlWithPathsContainer = document.getElementById('htmlWithPaths');
const downloadLink = document.getElementById('downloadLink');
const loading = document.getElementById('loading');
const errorContainer = document.getElementById('errorContainer');
const successContainer = document.getElementById('successContainer');
const assetContainer = document.getElementById('assetContainer');
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
        cutAssetsButton.disabled = true;
    } else {
       imageContainer.innerHTML = "";
       codeButton.disabled = true;
       cutAssetsButton.disabled = true;
    }
});

// Example function to cut the assets using Canvas
async function cutAssets(imageFile, jsonOutput) {
  return new Promise(async (resolve) => {
  const parsedJson = JSON.parse(jsonOutput);
    const img = new Image();
    img.onload = () => {
         const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
       const croppedAssets = {};

      parsedJson.forEach(item => {
          if (item.type === 'image' || item.type === 'icon' || item.type === 'background') { //Only cut image assets
                const { name, bounding_box, description } = item;
                const [y_min, x_min, y_max, x_max] = bounding_box;

                  const width = x_max - x_min;
                  const height = y_max - y_min;
                  canvas.width = width;
                   canvas.height = height;
                   ctx.drawImage(img, x_min, y_min, width, height, 0, 0, width, height);

              const croppedImage = canvas.toDataURL('image/png');
                croppedAssets[name] = {
                description: description.illustration || description.description || "",
                 src: croppedImage,
             };
          }
         });
           resolve(croppedAssets);
          };
          img.onerror = (error) => {
             console.error('Error:', error);
             reject(error);
          };
           img.src = URL.createObjectURL(imageFile);
  });
}

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
           cutAssetsButton.disabled = false;

           //Update html now with a button to show image
            let htmlPrompt =   `Based on the provided JSON array description of the UI and image assets, generate a complete and valid HTML file that accurately recreates the user interface depicted in the provided image. Use divs and spans to structure the UI. Generate inline CSS to position and style all the elements as described in the JSON array, using the provided bounding box coordinates and style attributes. For image assets (icons, backgrounds, etc), use the \`<img>\` tag and use the \`description\` field as the \`alt\` attribute. Use the 'name' property as a class for each div. Do not include any comments, explanations or code examples, and ensure that the output is only the HTML code itself, formatted with proper indentation, without the use of \`\`\`html or \`\`\`. Ensure that each alt is not empty or null. Here is the refined description: ${refinedDescription}`;
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

cutAssetsButton.addEventListener('click', async () => {
    if (!uploadedImageFile) {
       displayError("Please upload an image first!");
      return;
     }
     const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      displayError("Please enter your API key");
      return;
    }

     const refinedDescription = refinedDescriptionContainer.textContent;
       showLoading();
       let assets = {};
    try{
            assets =  await cutAssets(uploadedImageFile, refinedDescription);
              assetContainer.innerHTML = "";
                Object.values(assets).forEach(asset => {
                   assetContainer.innerHTML +=  `<img src="${asset.src}" alt="${asset.description}" style="max-width: 100px; max-height: 100px; margin: 5px" />`
               });

            // Generate HTML with image paths
          let htmlWithPathsPrompt =   `Based on the provided JSON array description of the UI and image assets, generate a complete and valid HTML file that accurately recreates the user interface depicted in the provided image. Use divs and spans to structure the UI. Generate inline CSS to position and style all the elements as described in the JSON array, using the provided bounding box coordinates and style attributes. For image assets (icons, backgrounds, etc), use the \`<img>\` tag and use the \`description\` field as the \`alt\` attribute. Use the 'name' property as a class for each div. Do not include any comments, explanations or code examples, and ensure that the output is only the HTML code itself, formatted with proper indentation, without the use of \`\`\`html or \`\`\`. Ensure that each alt is not empty or null.  Use the image src from following image assets if available, otherwise leave it empty. Image Assets : ${JSON.stringify(assets)} Here is the refined description: ${refinedDescription}`;
       const initialHtmlWithPathsResponse = await model.generateContent([htmlWithPathsPrompt, ...parts]);
        const initialHtmlWithPaths = initialHtmlWithPathsResponse.response.text();
      htmlWithPathsContainer.textContent = initialHtmlWithPaths;
         displaySuccess("Assets are cut, and HTML is generated");
      } catch(e){
          displayError("Could not cut assets!");
     } finally{
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
      htmlWithPathsContainer.textContent = "";
    downloadLink.style.display = 'none';
    errorContainer.style.display = 'none';
    successContainer.style.display = 'none';
    assetContainer.innerHTML = "";
      cutAssetsButton.disabled = true;
}

function displayError(errorMessage) {
    errorContainer.textContent = errorMessage;
    errorContainer.style.display = 'block';
}
function displaySuccess(successMessage) {
  successContainer.textContent = successMessage;
  successContainer.style.display = 'block';
}
