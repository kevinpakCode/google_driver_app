const CLIENT_ID = '';
const API_KEY = '';
const REDIRECT_URL = 'http://127.0.0.1:5500'
const SECRET_CODE = ''
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URL)}&response_type=code&scope=${scopes.join('%20')}`;
localStorage.setItem('expiry_date', new Date().getTime() + 20);
function redirectToGoogleAuth() {
  const scopes = ['https://www.googleapis.com/auth/drive'];
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URL)}&response_type=code&scope=${scopes.join('%20')}&access_type=offline`;
  window.location.href = authUrl;
}

async function handleAuthorizationCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const authorizationCode = urlParams.get('code');
  console.log('authorizationCode', authorizationCode);
  if (!authorizationCode) {
    console.error('Aucun code d\'autorisation trouvé.');
    return;
  }
  exchangeCodeForToken(authorizationCode).then(accessToken => {
    console.log('Jeton d\'accès:', accessToken);
    // Ici, vous devez également stocker le jeton d'actualisation si présent dans la réponse
  }).catch(error => {
    console.error('Erreur lors de l\'obtention du jeton d\'accès:', error);
  });
}

async function exchangeCodeForToken(code) {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: SECRET_CODE,
    redirect_uri: REDIRECT_URL,
    grant_type: 'authorization_code',
    code,
    scope: scopes.join('%20')
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
    const data = await response.json();
    localStorage.setItem('accessToken', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refreshToken', data.refresh_token);
      return data.access_token;
    }
  } catch (error) {
    console.error('Erreur lors de l\'échange du code d\'autorisation:', error);
    throw error;
  }
}
async function refreshTokenToAccessToken() {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: SECRET_CODE,
    grant_type: 'refresh_token',
    refresh_token: localStorage.getItem('refreshToken')
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
    const data = await response.json();
    console.log(data)
    console.log(data.access_token)
    return data.access_token;
  } catch (error) {
    console.error('Erreur lors de l\'obtention du jeton d\'accès:', error);
    throw error;
  }
}

async function checkAndRefreshAccessToken() {
  const accessToken = localStorage.getItem('accessToken');
  const expiryDate = localStorage.getItem('expiry_date');
  const currentTime = new Date().getTime();
  if (accessToken==='undefined' || expiryDate < currentTime) {
    try {
      const newAccessToken = await refreshTokenToAccessToken();
      localStorage.setItem('accessToken', newAccessToken);
      console.log('new accessToken',localStorage.getItem('accessToken'))
      localStorage.setItem('expiry_date', currentTime + 3600000);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du jeton d\'accès:', error);
    }
  }
}

async function getAllFile() {
  console.log(localStorage.getItem('accessToken'))
  try {
    console.log(localStorage.getItem('accessToken'))
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    })
    const files = await response.json();
    displayFiles(files.files);
  } catch (error) {
    console.log(error)
  }
}
async function uploadFile(file) {
  try {
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/octet-stream',
        'X-Upload-Content-Type': file.type,
        'X-Upload-Content-Length': file.size
      },
      body: file
    })
  } catch (error) {
    console.error(error)
  }
}
async function modifyFile(fileId) {
  try {
    const newName = prompt("Entrez le nouveau nom du fichier:");
    if (newName) {
      const accessToken = localStorage.getItem('accessToken'); // Assurez-vous que le jeton d'accès est valide
      const updateResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })
      if (updateResponse.ok) {
        alert('Fichier modifié avec succès.');
        location.reload(); // Actualisez la page pour voir les changements
      }
    }
  } catch (error) {
    console.error('Erreur de modification:', error);
  }
}

async function previewFile(fileId) {
  try {
    const accessToken = localStorage.getItem('accessToken'); // Assurez-vous que le jeton d'accès est valide
    const previewResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (previewResponse.ok) {
      const blob = await previewResponse.blob();
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL);
    } else {
      alert('Impossible de lire le fichier.');
    }
  } catch (error) {
    console.error('Erreur de prévisualisation:', error);
  }
}

async function deleteFile(fileId) {
  try {
    const accessToken = localStorage.getItem('accessToken'); // Assurez-vous que le jeton d'accès est valide
    const deleteResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (deleteResponse.ok) {
      alert('Fichier supprimé avec succès.');
      location.reload();
    }
  } catch (error) {
    console.error('Erreur de suppression:', error);
  }
}

async function displayFiles(files) {
  const fileListElement = document.getElementById('fileList');
  files.forEach(file => {
    const row = document.createElement('tr');
    row.innerHTML = `
          <td>${file.name}</td>
          <td><button class="previewFile action-button" onclick="event.preventDefault(); previewFile('${file.id}')">Prévisualiser</button></td>
          <td><button class="updateFile action-button" onclick="event.preventDefault(); modifyFile('${file.id}')">Modifier</button></td>
          <td><button class="deleteFile action-button" onclick="event.preventDefault(); deleteFile('${file.id}')">Supprimer</button></td>
      `;
    fileListElement.appendChild(row);
    row.querySelector('.previewFile').addEventListener('click', (e) => {
      e.preventDefault
      previewFile(file.id);
    })
    row.querySelector('.updateFile').addEventListener('click', (e) => {
      e.preventDefault
      modifyFile(file.id);
    })
    row.querySelector('.deleteFile').addEventListener('click', (e) => {
      e.preventDefault
      deleteFile(file.id);
    })
  });
}
if(localStorage.getItem('refreshToken')){
const authorizeBtn = document.querySelector('#authorize-btn');
authorizeBtn.style='display:none';
}else{
  const authorizeBtn = document.querySelector('#authorize-btn');
  authorizeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    redirectToGoogleAuth();
  })
}

// deconnexion du compte google
const getAllFileBtn = document.querySelector('#get-all-btn');

getAllFileBtn.addEventListener('click', (e) => {
  e.preventDefault();
  getAllFile();
})

// get submit file
const form = document.querySelector('form')
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = form.querySelector('#file').files[0];
  if (!file) {
    alert('Veuillez sélectionner un fichier.');
    return;
  }
  uploadFile(file);
});
handleAuthorizationCode()

setInterval(checkAndRefreshAccessToken, 200);