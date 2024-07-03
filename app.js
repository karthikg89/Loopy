/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/documentation/web-api/tutorials/code-flow
 */

var express = require('express');
var request = require('request');
var crypto = require('crypto');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '90578a866be642ed97064a098d97fecd'; // your clientId
var client_secret = '51aab784c7444a6f992995510988c0f4'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri


const generateRandomString = (length) => {
  return crypto
    .randomBytes(60)
    .toString('hex')
    .slice(0, length);
}

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
  .use(cors())
  .use(cookieParser());

app.get('/login', function (req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-read-playback-state user-modify-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function (req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function (req, res) {

  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
        refresh_token = body.refresh_token;
      res.send({
        'access_token': access_token,
        'refresh_token': refresh_token
      });
    }
  });
});

app.get('/play', function (req, res) {
  var access_token = req.query.access_token,
    refresh_token = req.query.refresh_token;

  var options = {
    url: 'https://api.spotify.com/v1/me/player/play',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };
  // Send the pause put request
  request.put(options, function (error, response, body) {
    if (!error) {
      console.log('play-status:' + response.statusCode);
    }
  });
  
  res.redirect('/');
});

app.get('/pause', function (req, res) {
  var access_token = req.query.access_token,
    refresh_token = req.query.refresh_token;

  var options = {
    url: 'https://api.spotify.com/v1/me/player/pause',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  // Send the pause put request
  request.put(options, function (error, response, body) {
    if (!error) {
      console.log('pause-status:' + response.statusCode);
    }
  });
  
  res.redirect('/');
});

app.get('/get_song_status', function (req, res) {
  var access_token = req.query.access_token,
    refresh_token = req.query.refresh_token;

  var options = {
    url: 'https://api.spotify.com/v1/me/player',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(options, function (error, response, body) {
    if (!error) {
      if (response.statusCode == 200) {
        //console.log(response.statusCode);
        //console.log(body);
        res.send({
          'song_title': body.item.name,
          'curr_pos': body.progress_ms,
          'length': body.item.duration_ms
        });
      } else if (response.statusCode == 204) {
        res.send({
          'song_title': "not active",
          'curr_pos': 0,
          'length': 0
        })
      } else {
        res.redirect('/');
      }
    }
  });
});

app.get('/seek_to_pos', function (req, res) {
  var access_token = req.query.access_token,
    refresh_token = req.query.refresh_token,
    pos = req.query.pos;
  console.log(pos);


  var options = {
    url: 'https://api.spotify.com/v1/me/player/seek?position_ms=' + pos,
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  // use the access token to access the Spotify Web API
  request.put(options, function (error, response, body) {
    if (!error) {
      console.log('seek status:' + response.statusCode);
    }
  });

  res.redirect('/');
});


console.log('Listening on 8888');
app.listen(8888);
