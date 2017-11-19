const express = require('express');
const path = require('path');
const logger = require('morgan');
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
//app.use(express.static(path.join(__dirname, 'public')));

const intervalTime = 5000;
let since = 0;
const tweets = [];

app.get('/tweets', function (req, res) {
  const threshold = req.query.since || 0;
  const fTweets = tweets.filter(s => s.id > threshold);
  const strArr = JSON.stringify(fTweets);

  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.send(`{"tweets": ${strArr}}`);
});

const initQuery$ = since => rxjs.Observable.fromPromise(client.get('search/tweets', {since_id: since, q: 'from:sbcfiredispatch',count: "100"}));
const timer$ = rxjs.Observable.interval(intervalTime);
timer$.flatMap(s => initQuery$(since))
    .filter(s => s.statuses.length !== 0)
    .filter(s => s.statuses.length !== 1 || s.statuses[0].id > since)
    .map(s => _.sortBy(s.statuses, 'id'))
    .subscribe(
      s => {
        s.map(t => ({id: t.id, text: t.text, date: t.created_at})).forEach(t => tweets.push(t));
        since = s[s.length - 1].id;
      },
      err => console.error(err),
      () => console.log('Should never finish')
);

module.exports = app;
