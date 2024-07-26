const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/generate-image', async (req, res) => {
    const data = req.body;
    const prompt = data.prompt || '';

    const url = 'https://api.vyro.ai/v1/imagine/api/generations';
    const headers = {
        'Authorization': 'Bearer vk-TLnQxLKTqPuN5H2fKIc4SVlvHb9FDh8fqblsX3MwJstgyr'
    };

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('style_id', '29');

    try {
        const response = await axios.post(url, form, { headers: form.getHeaders().append(headers) });

        if (response.status === 200) {
            const imageContent = Buffer.from(response.data);

            const sanitizedPrompt = prompt.replace(/[^\w\s]/gi, '').replace(/ /g, '_');
            const filename = `${sanitizedPrompt}.jpg`;

            const strapiForm = new FormData();
            strapiForm.append('files', imageContent, { filename, contentType: 'image/jpeg' });

            const strapiHeaders = {
                'Authorization': 'Bearer f71f5fa5cf16bf188b6bb05574fbf2140dfbcf38dc49cc38570cb0f8e20b1805c1720383e2a51872a957aa792e6c949cd4f8ca8b18325e233dff2f2962d30f0a1e67f6da09a11077c341f17554f6c683ffe7bd16e997d5fef8b58e86df8ec8e7c209ceaf56a511babd10501f86f37f6caeb373f1d2a21dc935cce8cd73d34bb9'
            };

            const strapiMediaResponse = await axios.post('http://localhost:1337/api/upload', strapiForm, { headers: strapiForm.getHeaders().append(strapiHeaders) });

            if (strapiMediaResponse.status === 200) {
                let imageUrl = strapiMediaResponse.data[0].url;
                if (!imageUrl.startsWith("http")) {
                    imageUrl = "http://localhost:1337" + imageUrl;
                }
                res.status(200).json({ success: true, image_url: imageUrl });
            } else {
                res.status(500).json({ error: 'Failed to upload image to Strapi media library' });
            }
        } else {
            res.status(500).json({ error: 'Failed to generate image' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3030, () => {
    console.log('Server is running on port 3030');
});
