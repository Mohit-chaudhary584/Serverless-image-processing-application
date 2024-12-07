AWS.config.region = 'us-east-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:a3d3522e-bec7-478e-9672-f0b6ee9bdf1e'
});

const s3 = new AWS.S3();
let selectedFile = null;

document.getElementById('upload-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const file = selectedFile || document.getElementById('file-input').files[0];
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    const key = file.name;
    const params = {
        Bucket: 'image-upload123',
        Key: key,
        Body: file,
        ContentType: file.type
    };

    s3.putObject(params, (err, data) => {
        if (err) {
            console.error('Error uploading file:', err);
            // alert('An error occurred while uploading the file.');
        } else {
            console.log('File uploaded successfully:', data);
            // alert('File uploaded successfully!');
            triggerLambdaForLabeling(key);
        }
    });
});

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const dropText = document.getElementById('drop-text');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventType => {
    dropArea.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

['dragenter', 'dragover'].forEach(eventType => {
    dropArea.addEventListener(eventType, () => dropArea.classList.add('dragover'));
});

['dragleave', 'drop'].forEach(eventType => {
    dropArea.addEventListener(eventType, () => dropArea.classList.remove('dragover'));
});

dropArea.addEventListener('drop', (event) => {
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelection(files[0]);
    }
});

dropArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (event) => {
    if (event.target.files.length > 0) {
        handleFileSelection(event.target.files[0]);
    }
});

function handleFileSelection(file) {
    selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        dropText.style.display = 'none';
        const existingImage = dropArea.querySelector('img');

        if (existingImage) {
            existingImage.src = e.target.result;
        } else {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Selected Image Preview';
            dropArea.appendChild(img);
            img.style.display = 'block';
        }
    };

    reader.readAsDataURL(file);
}

function triggerLambdaForLabeling(key) {
    const lambda = new AWS.Lambda();

    const params = {
        FunctionName: 'img',
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
            s3Bucket: 'image-upload123',
            s3Key: key
        })
    };

    console.log('Lambda invocation parameters:', params);

    lambda.invoke(params, (err, data) => {
        if (err) {
            console.error('Error invoking Lambda function:', err);
            alert('An error occurred while processing the image.');
        } else {
            const response = JSON.parse(data.Payload);
            console.log('Lambda response:', response);

            const responseBody = JSON.parse(response.body);

            if (responseBody && responseBody.labels) {
                displayLabels(responseBody.labels);
            } else {
                alert('No labels were detected.');
            }
        }
    });
}

function displayLabels(labels) {
    const labelsContainer = document.getElementById('labels');
    
    let list = labelsContainer.querySelector('ul');
    if (!list) {
        list = document.createElement('ul');
        list.style.listStyle = 'none';
        labelsContainer.appendChild(list);
    } else {
        list.innerHTML = '';
    }

    labels.forEach(label => {
        const listItem = document.createElement('li');
        listItem.textContent = label;
        list.appendChild(listItem);
    });
}

document.getElementById('user').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('#user i');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.replace('fa-moon', 'fa-sun');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
    }
});