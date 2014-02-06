var sys     =  require('util');
var http    =  require('http');
var url     =  require('url');
var fs      =  require('fs');
//~ var child   =  require('child_process')

//~ var OAuth  =  require('oauth').OAuth;
var conf    =  require('./conf');
var twitterAPI = require('node-twitter-api');

var sessionKeys = {};

console.log("\nServer is listening on port 8888....\n");

//https.createServer(options, function(req, res){

http.createServer( function(req, res){
   var path = url.parse(req.url).pathname;
   console.log("<req> ", path);

   switch (path){

      case ('/authenticate'):

         var body = "";
         req.on('data', function (chunk) {
            body += chunk;
         });
         req.on('end', function () {
            //This is required by pzp friendly name
            var reqFrom = cleanSessionID(JSON.parse(body).sessionID);
            console.log('<authenticate, POSTted> ' + reqFrom);

            confTMP = deepCopy(conf);

            confTMP.callback += "?sessionID=" + reqFrom;

            var twitter = new twitterAPI(confTMP);
            console.log('<authenticate> setting callbackTo:' + confTMP.callback);

            twitter.getRequestToken(function(err, oauthToken, oauthTokenSecret, result){
               if(err){
                  console.log("---------GetRequestToken---------");
                  console.log("ERROR: " + err);
                  console.log("---------------------------------");
               }
               else{
                  sessionKeys[reqFrom] = {reqTokenURL: "https://api.twitter.com/oauth/authorize?oauth_token="+oauthToken, access_token: "", access_token_secret: "", reqToken: oauthToken, reqTokenSecret: oauthTokenSecret};
               }

               twitter = null

               var jsonurl = JSON.stringify({"authURL":  sessionKeys[reqFrom].reqTokenURL});

               console.log(jsonurl);

               res.writeHead(200, { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': jsonurl.length, 'Access-Control-Allow-Origin' : '*' });
               res.write(jsonurl);
               res.end();

               delete twitter;
            });
         });

         break;

      case ('/accessToken'):

         if(url === undefined){
            sed404(res);
            break;
         }

         console.log("\n\n\n");
         console.log(req.url);
         console.log("\n\n\n");

         //TODO: close webView. In this example, close spawned child
         var tmpArray =    url.parse(req.url).query.split('&');
         var sessionID = tmpArray[0];
         var oauthAllIn={};
         var tmp = tmpArray[1].split('=');
         oauthAllIn[tmp[0]]=tmp[1];
         tmp = tmpArray[2].split('=');
         oauthAllIn[tmp[0]]=tmp[1];
         console.log(oauthAllIn);

         if(sessionID == undefined){
            send404(res);
            console.log("sessionID is undefined");
            break;
         }

         sessionID = sessionID.split('=')[1];
         console.log(sessionID);

         if(!(sessionKeys[sessionID])){
            console.log('ERROR: sessionKeys[sessionID] is undefined!');
            send404(res);
            break;
         }


         confTMP = deepCopy(conf);
         confTMP.callback += "?sessionID=" + sessionID;
         var twitter = new twitterAPI(confTMP);
         twitter.getAccessToken(sessionKeys[sessionID].reqToken, sessionKeys[sessionID].reqTokenSecret, oauthAllIn.oauth_verifier,
            function(err, oauthAccessToken, oauthAccessTokenSecret, results) {
               if(err){
                  console.log('<accessToken> Error!!!  ' + err);
                  return;
               }

               console.log(oauthAccessToken);

               console.log('<accessToken,twitterKeys> %j\n', results || 'ERROR');

               if (sessionKeys[sessionID] != undefined) {
                  if (oauthAccessToken != undefined) {
                     sessionKeys[sessionID].access_token = oauthAccessToken;
                     sessionKeys[sessionID].access_token_secret = oauthAccessTokenSecret;
                  } else {
                     delete sessionKeys[sessionID];
                  }
               } else {
                  console.log("ACCESS_TOKEN: sessionID not found");
               }

               var redirect = "<HTML>"
               redirect+="<SCRIPT LANGUAGE='JavaScript'>";
               redirect+="window.open('','_self',''); window.close();";
               redirect+="</SCRIPT></HTML>";

               res.writeHead(200, {'Content-Type': 'text/html','Content-Length':redirect.length});
               res.write(redirect);
               res.end();

               delete twitter;

            }
         );
         break;

      case ('/isAlreadyAuthenticated'):

         var body = "";
         req.on('data', function (chunk){body += chunk;});
         req.on('end', function () {
            if(body != ""){
               var reqFrom = cleanSessionID(JSON.parse(body).sessionID);
               console.log('<isAlreadyAuthenticated, GETted> ' + reqFrom);


               //check if the session key sent in the request is already stored in sessionKeys
               if((sessionKeys[reqFrom])){
                  console.log(sessionKeys[reqFrom].access_token);
                  if(sessionKeys[reqFrom].access_token != ""){
                     res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
                     res.write("true");
                     console.log('<isAlreadyAuthenticated, replyed> true');
                  } else {
                     res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
                     res.write("false");
                     console.log('<isAlreadyAuthenticated, replyed> false');
                  }
               } else {
                  res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
                  res.write("false");
                  console.log('<isAlreadyAuthenticated, replyed> false');
               }
               res.end();
            } else {
               res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
               res.end();
               console.log('<isAlreadyAuthenticated, replyed> empty body');
            }
         });


         break ;

      case ('/tweet'):

         var body = "";
         req.on('data', function (chunk) {
            body += chunk;
         });
         req.on('end', function () {
            console.log('<tweet, POSTed:> ' + body);

            var tweet = JSON.parse(body);
            tweet.sessioID = cleanSessionID(tweet.sessionID);

            if(sessionKeys[tweet.sessionID] !== undefined){

               var twitter = new twitterAPI(conf);

               twitter.statuses("update", {status: tweet.tweet}, sessionKeys[tweet.sessionID].access_token, sessionKeys[tweet.sessionID].access_token_secret,
                  function(err, data, response) {
                     if (err){
                        console.log('ERROR:' + sys.inspect(error));
                        res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
                        res.write(false);
                        res.end();
                     } else {
                        res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
                        res.end();
                     }
                  }
               );
            } else {
               res.writeHead(403, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
               res.end();
            }
         });

         break;

      case ('/getFriends'):
         console.log('<getFriends, requested:> ');

         var sessionID = url.parse(req.url).query.split('=')[1];
         sessionID = sessionID.split('&')[0];
         sessionID = cleanSessionID(sessionID);

         if(sessionKeys[sessionID] !== undefined){

            console.log("oAuth getFriends was invoked");

            var twitter = new twitterAPI(conf);

            twitter.friends("ids", {}, sessionKeys[sessionID].access_token, sessionKeys[sessionID].access_token_secret,
               function(err, data, results) {
                  if (err) {
                     console.log('ERROR:' + sys.inspect(err));
                     res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
                     res.write(false);
                     res.end();
                  } else {
                     //split the request into batches of 100 persons
                     var buffer = [];
                     console.log (data);
                     var ids = data.ids;
                     var sem = 0;
                     while (ids.length>0){
                        sem++;

                        var currentids;
                        if (ids.length>100){
                           currentids = ids.splice(0,100);
                        } else {
                           currentids = ids.splice(0,ids.length);
                        }

                        twitter.users("lookup", {user_id: currentids.join(",")}, sessionKeys[sessionID].access_token, sessionKeys[sessionID].access_token_secret,
                           function(err, data, response){
                              buffer = buffer.concat(data);

                              sem--;
                              if (sem == 0) {
                                 res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*' });
                                 res.write(JSON.stringify(buffer));
                                 res.end();
                              }
                           }
                        )
                     }
                  }
               }
            );
         }
         break;

      case ('/getTimeline'):
         console.log('<getTimeline, requested:> ');

         var sessionID = url.parse(req.url).query.split('=')[1];
         sessionID = sessionID.split('&')[0];
         sessionID = cleanSessionID(sessionID);

         if(sessionKeys[sessionID] !== undefined){

            console.log("oAuth getTimeline was invoked");

            var twitter = new twitterAPI(conf);

            twitter.getTimeline("home", {}, sessionKeys[sessionID].access_token, sessionKeys[sessionID].access_token_secret,
               function(err, data) {
                  if (err) {
                     console.log('ERROR:' + sys.inspect(error));
                     res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
                     res.write("false");
                     res.end();
                  }
                  else {
                     //getusersinfo
                     console.log(data);
                     res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*' });
                     res.write(JSON.stringify(data));
                     res.end();
                  }
               }
            );
         } else {
            res.writeHead(403, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
            res.end();
         }

         break;

      case ('/logout'):
         var body = "";
         req.on('data', function (chunk) {
            body += chunk;
         });
         req.on('end', function () {
            if(body!=""){
               var tweet = JSON.parse(body);
               tweet.sessionID = cleanSessionID(tweet.sessionID);
               if(sessionKeys[tweet.sessionID] !== undefined){
                  delete sessionKeys[tweet.sessionID];
                  console.log("--logout: "+tweet.sessionID);
                  res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
                  res.end();
               } else {
                  res.writeHead(403, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
                  res.end();
               }
            } else {
               res.writeHead(404, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
               res.end();
               console.log('<logout, replyed> empty body');
            }
         });
         break;

      case ('/favicon.ico'):
         res.writeHead(200)
         res.end();
         break;

      default:
         if (/\.(js|html|htm)$/.test(path)){
            console.log("<sending> "+__dirname+path+" (type: js|html|htm)");

            try {
               res.writeHead(200, {'Content-Type': ('text/' + (path.substr(-3) === '.js' ? 'javascript' : 'html'))});
               res.write(fs.readFileSync(__dirname + path, 'utf8'));
               res.end();
            } catch(e){ send404(res); }

            break;

         } else if (/\.(css)$/.test(path)){
            console.log("<sending> "+__dirname+path+" (type: css)");

            try {
               res.writeHead(200, {'Content-Type': 'text/css'});
               res.write(fs.readFileSync(__dirname + path, 'utf8'));
               res.end();
            } catch(e){ send404(res); }

            break;
         } else if (/\.(png)$/.test(path)){
            console.log("<sending> "+__dirname+path+" (type: png)");

            try {
               res.writeHead(200, {'Content-Type': 'img/png'});
               res.write(fs.readFileSync(__dirname + path));
               res.end();
            } catch(e){ send404(res); }

            break;
         } else if (/\.(jpg|jpeg)$/.test(path)){
            console.log("<sending> "+__dirname+path+" (type: jpg)");

            try {
               res.writeHead(200, {'Content-Type': 'img/jpg'});
               res.write(fs.readFileSync(__dirname + path));
               res.end();
            } catch(e){ send404(res); }

            break;
         } else if (/\.(wsdl|wsd)$/.test(path)){
            console.log("<sending> "+__dirname+path+" (type: jpg)");

            try {
               res.writeHead(200, {'Content-Type': 'img/jpg'});
               res.write(fs.readFileSync(__dirname + path));
               res.end();
            } catch(e){ send404(res); }

            break;
         }
      }
}).listen(8888);



function send404(res){
    res.writeHead(404, {"Content-Type": "text/plain"});
    res.write("404 Not found");
    res.end();
}

function cleanSessionID(id){

   id = id.replace(/\s/g,'_');
   id = id.replace(/\%20/g,'_');
   id = id.replace(/\'/g,'');
   id = id.replace(/\(/g,'');
   id = id.replace(/\)/g,'');
   return id;
}



function deepCopy(p,c) {
   var c = c||{};
   for (var i in p) {
      if (typeof p[i] === 'object') {
         c[i] = (p[i].constructor === Array)?[]:{};
         deepCopy(p[i],c[i]);
      } else c[i] = p[i];}
   return c;
}
