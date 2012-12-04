//
// Important: for long term stability of the identifier received from Google
//            it may be wise to pass an app identifier to Google rather than
//	          receive a randomly salted identifier as implemented now, even
//	          though it works as is now.
//
// this is from node-openid's sample file. I modified it.
// Note that, the same flow can be probably implemented at half a day's work, 
// by following the OpenID protocol while being aided by this example. Maybe a day's work,
// if obtaining the user's email and name is required.
//
// Relevant links:
// https://developers.google.com/accounts/docs/OpenID
// https://developers.google.com/accounts/docs/OpenID#endpoint
// http://openid.net/specs/openid-authentication-2_0.html#anchor45
// https://github.com/havard/node-openid
// http://goo.gl/HFO9Y (stackoverflow Retrieve OpenID AX attributes from Google)  
//
// The project is right now hosted on Heroku at http://warm-anchorage-1114.herokuapp.com/, 
// and it cannot fully work locally (only partially), because Google needs to be able to redirect back
// to the address supplied to it, and private network hosts are not reachable (DNS lookup..) to Google.
// So this web server can reach Google, but Google can't reach it back unless it has a hosted DNS name.
//
// For a button that says 'login with Google' or the like, see excelent resources at:
// http://stackoverflow.com/questions/9509475/free-standard-sign-in-with-google-button
//

/* A simple sample demonstrating OpenID for node.js
 *
 * http://ox.no/software/node-openid
 * http://github.com/havard/node-openid
 *
 * Copyright (C) 2010 by H?vard Stranden
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 */

var port = process.env.PORT || 8090;  // for Heroku runtime compatibility
 
var openid = require('openid');
var url = require('url');
var querystring = require('querystring');

var extensions = [new openid.UserInterface(), 
                  new openid.SimpleRegistration(
                      {
                        "nickname" : true, 
                        "email" : true, 
                        "fullname" : true,
                        "dob" : true, 
                        "gender" : true, 
                        "postcode" : true,
                        "country" : true, 
                        "language" : true, 
                        "timezone" : true
                      }),
                  new openid.AttributeExchange(
                      {
                        "http://schema.openid.net/contact/email": "required",
                        "http://openid.net/schema/namePerson/first": "required",
                        "http://openid.net/schema/namePerson/last": "required"
                      })];

var relyingParty = new openid.RelyingParty(
    'http://warm-anchorage-1114.herokuapp.com/verified', // url for the login service to return to
    null, // Realm (optional, specifies realm for OpenID authentication)
    false, // Use stateless verification
    false, // Strict mode
    extensions); // List of extensions to enable and include // was 'extensions' before


var server = require('http').createServer(
    function(req, res)
    {
        var parsedUrl = url.parse(req.url);
		console.log('Received request url ' + parsedUrl + ', method=' + req.method);
        if(parsedUrl.pathname == '/google')
        { 
          // User supplied identifier
          var query = querystring.parse(parsedUrl.query);
          //var identifier = query.openid_identifier;
		  
		  identifier = "https://www.google.com/accounts/o8/id";

          // Resolve identifier, associate, and build authentication URL
          relyingParty.authenticate(identifier, false, function(error, authUrl)
          {
            if(error)
            {
              res.writeHead(200, { 'Content-Type' : 'text/plain; charset=utf-8' });
              res.end('Authentication failed: ' + error.message);
            }
            else if (!authUrl)
            {
              res.writeHead(200, { 'Content-Type' : 'text/plain; charset=utf-8' });
              res.end('Authentication failed');
            }
            else
            {
              res.writeHead(302, { Location: authUrl });
              res.end();
            }
          });
        }
        else if(parsedUrl.pathname == '/verified')
        {
          // Verify identity assertion
          // NOTE: Passing just the URL is also possible
          relyingParty.verifyAssertion(req, function(error, result)
          {
            res.writeHead(200, { 'Content-Type' : 'text/plain; charset=utf-8' });

            if(error)
            {
              res.end('Authentication failed: ' + error.message);
            }
            else
            {
              // Result contains properties:
              // - authenticated (true/false)
              // - answers from any extensions (e.g. 
              //   "http://axschema.org/contact/email" if requested 
              //   and present at provider)
			  
              //res.end((result.authenticated ? 'Success :)' : 'Failure :(') +
              //  '\n\n' + JSON.stringify(result));
			  console.log(JSON.stringify(result));
			  
			  if (result.authenticated)
			  {
			    res.end('authentication status: ' + result.authenticated + '.\n' + 'the returned identity identifier is '+ result.claimedIdentifier + '\nall data of the request follows:\n ' + JSON.stringify(result)); // this prints all the attributes requested on top the login if any, such as
				// users's first and last name, email address, or any other requested attribute from the 
				// the Google or other account provider.
			  }
			  else
			  {
			    res.end("couldn't authenticate. " + JSON.stringify(result));
			  }
            }
          });
        }
        else
        {
            // Deliver an OpenID form on all other URLs
            res.writeHead(200, { 'Content-Type' : 'text/html; charset=utf-8' });
            res.end('<!DOCTYPE html><html><body>'
                + '<form method="get" action="/authenticate">'
                + "<p>Welcome. Go to /google for google login, or paste an OpenID login provider's endpoint below</p>"
                + '<input name="openid_identifier" />'
                + '<input type="submit" value="Go" />'
                + '</form></body></html>');
        }
    });
server.listen(port);