const express = require('express');
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
app.use(logger('combined'));

const get$ = new rxjs.Subject();

app.get('/tweets', function (req, res) {
  const threshold = req.query.since || 0;
  get$.next({res: res, since_id: threshold});
});

const initQuery$ = since => {
  return rxjs.Observable.forkJoin(
      rxjs.Observable.fromPromise(client.get('search/tweets', {since_id: since['since_id'], q: 'from:sbcfiredispatch',count: "100"})),
      rxjs.Observable.of(since['res'])
  )
};
get$.flatMap(since => initQuery$(since))
    .subscribe(
      obj => {
        const s = obj[0].statuses;
        const res = obj[1];

        console.log(`Received ${s.length}`);
        const tweets = s.map(t => ({id: t.id, text: t.text, date: t.created_at}));

        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.send(JSON.stringify({tweets: tweets}));
      },
      err => console.error(err),
      () => console.log('Should never finish')
);

module.exports = app;
