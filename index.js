/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-shadow */
import express from 'express';
import methodOverride from 'method-override';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment';
import cookieParser from 'cookie-parser';
import {
  add, read, write,
} from './jsonFileStorage.js';

const app = express();
const port = 3004;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(cookieParser());
moment().format();
let visits = 0;
const oneDayInSeconds = 24 * 60 * 60;
const favoritedIndexObject = [];

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
// app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '/public')));
// Override POST requests with query param ?_method=PUT to be PUT requests
app.use(methodOverride('_method'));

const reportSighting = (req, res) => {
  console.log('Reporting UFO Sighting!');
  res.render('report');
  if (req.cookies.visits) {
    visits = Number(req.cookies.visits); // get the value from the request
  }

  // set a new value of the cookie
  visits += 1;
  res.cookie('visits', visits, { maxAge: oneDayInSeconds });
};

const getSightingByIndex = (req, res) => {
  read('data.json', (err, jsonContentObj) => {
    const { index } = req.params;
    const sightingInfo = jsonContentObj.sightings[index];
    const m = sightingInfo.date_time;
    const momentOfSighting = moment(m, 'DD/MM/YYYY hh:mm').format('dddd [,] MMMM Do YYYY');
    const momentOfReport = moment(sightingInfo.date_time_report);
    const momentsAgo = momentOfReport.fromNow();

    res.render('view-by-index', {
      sightingInfo, index, momentsAgo, momentOfSighting,
    });
  });
  if (req.cookies.visits) {
    visits = Number(req.cookies.visits); // get the value from the request
  }

  // set a new value of the cookie
  visits += 1;
  res.cookie('visits', visits, { maxAge: oneDayInSeconds });
};

const postSighting = (req, res) => {
  const today = new Date();
  const dateToday = today.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const m = req.body.date_time;
  console.log(m);
  const result = moment(m, 'DD/MM/YYYY HH:mm').isValid();
  console.log(result);
  if (result === false) {
    res.render('invalid-date');
  }
  else if (result === true) {
    const regex = /\d+\/\d+\/\d+(?=\s)/gm;
    const onlyDateOfSighting = m.match(regex)[0];
    const reportedSighting = onlyDateOfSighting.replaceAll('/', '');
    const dayOfReport = dateToday.replaceAll('/', '');
    console.log(reportedSighting);
    console.log(dayOfReport);
    if (reportedSighting > dayOfReport) {
      res.render('invalid-date');
    }
    else {
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
      if (req.cookies.visits) {
        visits = Number(req.cookies.visits); // get the value from the request
      }

      // set a new value of the cookie
      visits += 1;
      res.cookie('visits', visits, { maxAge: oneDayInSeconds });
      console.log('Posting UFO sighting!');
    }
  }
};

const getAllSightings = (req, res) => {
  let m;
  let allMoments = [];
  console.log('Getting All UFO Sightings!');
  read('data.json', (err, jsonContentObj) => {
    let sightingInfo = jsonContentObj.sightings;
    for (let i = 0; i < sightingInfo.length; i++) {
      const dateTime = sightingInfo[i].date_time;
      m = moment(dateTime, 'DD/MM/YYYY hh:mm').format('dddd [,] MMMM Mo YYYY');
      allMoments.push(m);
    }
    let sortBy = 'Default';

    sightingInfo = sightingInfo.map((sighting, index) => ({
      ...sighting,
      index,
    }));
    if (Object.keys(req.query).length > 0) {
      sortBy = req.query.sort;
      if (sortBy === 'date_time') {
        const regex = /(?!=($))\d{4}/;
        allMoments = allMoments.sort((a, b) => (a.match(regex) > b.match(regex) ? 1 : -1));
        console.log('Sorting by date and time!');
      }
      else {
        sightingInfo = sightingInfo.sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : -1));
        console.log(`Sorting by ${Object.values(req.query)}!`);
      }
    }
    if (req.cookies.visits) {
      visits = Number(req.cookies.visits); // get the value from the request
    }

    visits += 1;
    // maxAge will ensure cookie expires after 24 hours
    res.cookie('visits', visits, { maxAge: oneDayInSeconds });
    res.render('view-all', {
      sightingInfo,
      sortBy,
      allMoments,
    });
  });
};

const getSightingByIndexForEdit = (req, res) => {
  read('data.json', (err, jsonContentObj) => {
    const { index } = req.params;
    const sightingInfo = jsonContentObj.sightings[index];
    sightingInfo.index = index;
    if (req.cookies.visits) {
      visits = Number(req.cookies.visits); // get the value from the request
    }

    // set a new value of the cookie
    visits += 1;
    res.cookie('visits', visits, { maxAge: oneDayInSeconds });

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
      if (req.cookies.visits) {
        visits = Number(req.cookies.visits); // get the value from the request
      }

      // set a new value of the cookie
      visits += 1;
      res.cookie('visits', visits, { maxAge: oneDayInSeconds });
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
      if (req.cookies.visits) {
        visits = Number(req.cookies.visits); // get the value from the request
      }

      // set a new value of the cookie
      visits += 1;
      res.cookie('visits', visits, { maxAge: oneDayInSeconds });
    });
    res.redirect(301, '/');
  });
};

const getShapes = (req, res) => {
  read('data.json', (err, jsonContentObj) => {
    const sightingInfo = jsonContentObj.sightings;

    res.render('all-shapes', { sightingInfo });
  });
};

const sortByShapes = (req, res) => {
  let m;
  const allMoments = [];
  read('data.json', (err, jsonContentObj) => {
    const { shape } = req.params;
    const shapeSorted = [];
    const sightingInfo = jsonContentObj.sightings;
    for (let i = 0; i < sightingInfo.length; i++) {
      if (shape === sightingInfo[i].shape) {
        shapeSorted.push(sightingInfo[i]);
      }
    }
    for (let j = 0; j < shapeSorted.length; j++) {
      const dateTime = shapeSorted[j].date_time;
      m = moment(dateTime, 'DD/MM/YYYY hh:mm').format('dddd [,] MMMM Mo YYYY');
      allMoments.push(m);
    }
    if (req.cookies.visits) {
      visits = Number(req.cookies.visits); // get the value from the request
    }

    // set a new value of the cookie
    visits += 1;
    res.cookie('visits', visits, { maxAge: oneDayInSeconds });
    res.render('shape', {
      shapeSorted, sightingInfo, shape, allMoments,
    });
  });
};

const favoriteSightings = (req, res) => {
  const { index } = req.params;
  const uniqueObject = [];
  res.cookie('favorited', index);
  read('data.json', (err, jsonContentObj) => {
    const sightingInfo = jsonContentObj.sightings;
    const favorited = sightingInfo[req.cookies.favorited];
    favoritedIndexObject.push(favorited);
    favoritedIndexObject.forEach((element) => {
      if (!uniqueObject.includes(element)) {
        uniqueObject.push(element);
      }
    });
  });

  res.render('favorite-sightings', { uniqueObject });
};

// const favoritedSightings = (req, res) => {
//   read('data.json', (err, jsonContentObj) => {
//     const sightingInfo = jsonContentObj.sightings;

//     res.render('favorite-sightings', { sightingInfo });
//   });
// };

app.get('/', getAllSightings);
app.get('/sighting-report', reportSighting);
app.post('/sighting-report', postSighting);
app.get('/sighting/:index', getSightingByIndex);
app.get('/sighting/:index/edit', getSightingByIndexForEdit);
app.put('/sighting/:index/edit', editSighting);
app.delete('/sighting/:index', deleteSighting);
app.get('/shape', getShapes);
app.get('/shape/:shape', sortByShapes);
app.get('/sighting/:index/favorited', favoriteSightings);
app.get('/favorite-sightings', favoriteSightings);

app.listen(port);
