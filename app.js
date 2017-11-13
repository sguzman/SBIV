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

app.get('/tweets', function (req, res) {
  const threshold = req.query.since || 0;
  const fTweets = tweets.filter(s => s.id > threshold);
  const strArr = JSON.stringify(fTweets);
  res.send(`{"tweets": ${strArr}}`);
});

const initQuery$ = since => rxjs.Observable.fromPromise(client.get('search/tweets', {since_id: since, q: 'from:sbcfiredispatch',count: "100"}));
const timer$ = rxjs.Observable.interval(intervalTime);
timer$.do(s => console.log(`Since is ${since}`))
    .flatMap(s => initQuery$(since))
    .do(s => since = s.search_metadata.max_id)
    .map(s => s.statuses)
    .map(s => s.reverse())
    .map(s => s.map(t => ({id: t.id, text: t.text})))
    .map(s => {
      if (s.length === 1) {
        if (s[0].id === since) {
          return [];
        } else {
          return s;
        }
      } else {
        return s;
      }
    })
    .do(s => {
      s.forEach(t => tweets.push(t))
    })
    .subscribe(
      s => {
        console.log(`Received another batch of tweets of ${s.length} tweets`);
      },
      err => console.error(err),
      () => console.log('Should never finish')
);

module.exports = app;
