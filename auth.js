// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const config = require('./config.js');
const fs = require('fs')

function authdone(atoken,rtoken, profile)
{
  console.log("Passport Callback for Verify");
  console.log("AuthToken: "+atoken);
  console.log("RefreshToken: "+rtoken);
  console.log("Profile: "+profile);
  fs.writeFileSync('rtoken.txt',rtoken);
  config.atoken = {expires_in:30*60, access_token:atoken, expiretime : Date.now()+30*60*1000};
  config.startService();
}

const GoogleOAuthStrategy = require('passport-google-oauth20').Strategy;
const { set } = require('node-persist');
module.exports = (passport) => {
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
  passport.use(new GoogleOAuthStrategy(
      {
        clientID: config.oAuthClientID,
        clientSecret: config.oAuthclientSecret,
        callbackURL: config.oAuthCallbackUrl,
        scope: ['https://www.googleapis.com/auth/userinfo.email', 
                'https://www.googleapis.com/auth/userinfo.profile', 'openid'],
        // Set the correct profile URL that does not require any additional APIs
        userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
      },
      (token, refreshToken, profile, done) => {
        done(null,{profile,token});
        authdone(token,refreshToken,profile);
      }));
};