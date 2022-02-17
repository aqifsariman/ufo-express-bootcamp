/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-shadow */
import express from 'express';
import methodOverride from 'method-override';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  add, read, write,
} from './jsonFileStorage.js';

const app = express();
const port = 3004;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
// app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '/public')));
// Override POST requests with query param ?_method=PUT to be PUT requests
app.use(methodOverride('_method'));

const reportSighting = (req, res) => {
  console.log('Reporting UFO Sighting!');
  res.render('report');
};

const getSightingByIndex = (req, res) => {
  read('data.json', (err, jsonContentObj) => {
    const { index } = req.params;
    const sightingInfo = jsonContentObj.sightings[index];
    res.render('view-by-index', { sightingInfo, index });
  });
};

const postSighting = (req, res) => {
  add('data.json', 'sightings', req.body, (err) => {
    if (err) {
      res.status(500).send('DB Write Error!');
    }
    console.log('Submitting Report!');
    read('data.json', (err, jsonContentObj) => {
      const sightingInfo = jsonContentObj.sightings;
      const index = (sightingInfo.length) - 1;
      res.redirect(301, `/sighting/${index}`);
    });
  });

  console.log('Posting UFO sighting!');
};

const getAllSightings = (req, res) => {
  read('data.json', (err, jsonContentObj) => {
    const sightingInfo = jsonContentObj.sightings;
    res.render('view-all', { sightingInfo });
  });
};

const getSightingByIndexForEdit = (req, res) => {
  read('data.json', (err, jsonContentObj) => {
    const { index } = req.params;
    const sightingInfo = jsonContentObj.sightings[index];
    sightingInfo.index = index;
    res.render('edit', { sightingInfo });
  });
};

const editSighting = (req, res) => {
  const { index } = req.params;
  const changes = req.body;
  read('data.json', (err, jsonContentObj) => {
    if (err) {
      console.error('Read error', err);
      return;
    }
    const sightingInfo = jsonContentObj.sightings;
    sightingInfo.splice(index, 1, changes);
    const updatedSightingInfo = {};
    updatedSightingInfo.sightings = sightingInfo;

    write('data.json', updatedSightingInfo, (writeErr) => {
      if (writeErr) {
        console.log('writing error', writeErr);
      }

      res.render('edit', { sightingInfo, index });
    });
  });
};

const deleteSighting = (req, res) => {
  const { index } = req.params;
  read('data.json', (err, jsonContentObj) => {
    if (err) {
      console.error('Read error', err);
      return;
    }
    const sightingInfo = jsonContentObj.sightings;
    sightingInfo.splice(index, 1);
    const updatedSightingInfo = {};
    updatedSightingInfo.sightings = sightingInfo;

    write('data.json', updatedSightingInfo, (writeErr) => {
      if (writeErr) {
        console.log('writing error', writeErr);
      }

      res.redirect(301, '/');
    });
  });
};

const getShapes = (req, res) => {
  read('data.json', (err, jsonContentObj) => {
    const sightingInfo = jsonContentObj.sightings;

    res.render('all-shapes', { sightingInfo });
  });
};

const sortByShapes = (req, res) => {
  read('data.json', (err, jsonContentObj) => {
    const { shape } = req.params;
    const shapeSorted = [];
    const sightingInfo = jsonContentObj.sightings;
    for (let i = 0; i < sightingInfo.length; i++) {
      if (shape === sightingInfo[i].shape) {
        shapeSorted.push(sightingInfo[i]);
      }
    }
    res.render('shape', { shapeSorted, sightingInfo, shape });
  });
};

app.get('/', getAllSightings);
app.get('/sighting-report', reportSighting);
app.post('/sighting-report', postSighting);
app.get('/sighting/:index', getSightingByIndex);
app.get('/sighting/:index/edit', getSightingByIndexForEdit);
app.put('/sighting/:index/edit', editSighting);
app.delete('/sighting/:index', deleteSighting);
app.get('/shapes', getShapes);
app.get('/shapes/:shape', sortByShapes);

app.listen(port);
