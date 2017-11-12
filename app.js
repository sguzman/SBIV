const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const rxjs = require('rxjs');
const RxHR = require('@akanass/rx-http-request').RxHR;

const app = express();

app.set('views', path.join(__dirname, 'views'));

app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));

const intervalTime = 2000;

rxjs.Observable.interval(intervalTime).scan((acc, curr) => acc + 1).subscribe(
    s => console.log(s)
);


module.exports = app;
