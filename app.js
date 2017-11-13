const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const rxjs = require('rxjs');
const Twit = require('twitter');
const fs = require('fs');
const _ = require('lodash');

const secrets = JSON.parse(fs.readFileSync('./secret.json'));

const client = new Twit({
  consumer_key: secrets.consumerKey,
  consumer_secret: secrets.consumerSecretKey,
  access_token_key: secrets.accessToken,
  access_token_secret: secrets.accessTokenSecret
});

const app = express();

app.set('views', path.join(__dirname, 'views'));

app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));

const intervalTime = 5000;
let since = 0;
const tweets = [];

const initQuery$ = since => rxjs.Observable.fromPromise(client.get('search/tweets', {since_id: since, q: 'from:sbcfiredispatch',count: "100"}));
const timer$ = rxjs.Observable.interval(intervalTime);
timer$.do(s => console.log(`Since is ${since}`))
    .flatMap(s => initQuery$(since))
    .do(s => since = s.search_metadata.max_id)
    .map(s => s.statuses)
    .map(s => s.reverse())
    .map (s => s.map(t => ({id: t.id, text: t.text})))
    .do(s => {
      _.tail(s).forEach(t => tweets.push(t));
      if (s.length === 100 || s[0].id !== since) tweets.push(_.head(s));
    })
    .subscribe(
      s => {
        console.log('Received another batch of tweets');
      },
      err => console.error(err),
      () => console.log('Should never finish')
);

module.exports = app;
