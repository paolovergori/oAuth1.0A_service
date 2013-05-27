var sys     =  require('util');
var http    =  require('http');
var url     =  require('url');
var fs      =  require('fs');
var child   =  require('child_process')

var OAuth  =  require('oauth').OAuth;
var conf    =  require('./conf');
var Tweeter =  require('tweeter');
Tweeter.prototype.setConfig = function(config){ this.config = config; };

var tweeter = new Tweeter(deepCopy(conf));
var sessionCallbackURL = tweeter.config.oauthCallback;

//var options = {
//  key: fs.readFileSync('./server.key'),
//  cert: fs.readFileSync('./server.crt')
//};

var sessionKeys = {};
 
console.log("\nServer is listening on port 8888....\n");

//https.createServer(options, function(req, res){
		  
http.createServer( function(req, res){
    var path = url.parse(req.url).pathname;
    console.log("<req> ", path);
	
     //sys.puts(sys.inspect(req));
	
console.log(path);
     
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
			
			//TODO: This is needed to overcome missing callbackURL parameter in tweeter.authenticate

			//cloning the object to avoid two simultaneous requests to be responded with two sessionIDs concatenated. (not fast enough to work on one obj only!)
			var tweeterTMP = new Tweeter(deepCopy(conf));
				
			tweeterTMP.config.oauthCallback += "?sessionID=" + reqFrom;
			console.log('<authenticate> setting callbackTo:' + tweeterTMP.config.oauthCallback);
			tweeterTMP.authenticate(function(err, data){		
				
				if(err){
					console.log('<authenticate> Error: ' + err); 
					return;
				}
				
				console.log('<authenticate, authUrl> %j', data.authUrl || 'ERROR');						
				
				sessionKeys[reqFrom] = {reqTokenURL: data.authUrl, access_token: "", access_token_secret: "", reqToken: tweeterTMP.config.token, reqTokenSecret: tweeterTMP.config.tokenSecret};		
				
				tweeterTMP = null;	
				var jsonurl = JSON.stringify({"authURL": data.authUrl});
				
				res.writeHead(200, { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': jsonurl.length, 'Access-Control-Allow-Origin' : '*' });			
				res.write(jsonurl);
				//res.write(data.authUrl);	
				res.end();	
				
				delete tweeterTMP;					
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
		var tmpArray = 	url.parse(req.url).query.split('&');    
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

		//TODO: just more awfulness...
	    	sessionID = sessionID.split('=')[1];
		console.log(sessionID);

		if(!(sessionKeys[sessionID])){
		  console.log('ERROR: sessionKeys[sessionID] is undefined!');
		  send404(res);
  		  break;
		}
	    
		    //TODO: this is the same awful thing as above...lack of token and tokenSecret parameter in tweeter.getAccessToken 
		    var tweeterTMP = new Tweeter(deepCopy(conf));
		    tweeterTMP.config.token = sessionKeys[sessionID].reqToken;
		    tweeterTMP.config.tokenSecret = sessionKeys[sessionID].reqTokenSecret;
		    	    
		    tweeterTMP.getAccessToken( function( self, err, data){
			if(err){
			    console.log('<accessToken> Error!!!  ' + err); 
			    return;
			}
			
			console.log(tweeterTMP.config.accessToken);

			console.log('<accessToken,twitterKeys> %j\n', self || 'ERROR');
			  
			if(sessionKeys[sessionID] != undefined){
			   if(tweeterTMP.config.accessToken != undefined)
			   {
 			      sessionKeys[sessionID].access_token = tweeterTMP.config.accessToken;
 			      sessionKeys[sessionID].access_token_secret = tweeterTMP.config.accessTokenSecret;
			   }
			   else
			   {
			      delete sessionKeys[sessionID];
			   }
			}
			else
			   console.log("ACCESS_TOKEN: sessionID not found");

			var redirect = "<HTML>"
			redirect+="<SCRIPT LANGUAGE='JavaScript'>";
			redirect+="window.open('','_self',''); window.close();";
			redirect+="</SCRIPT></HTML>";
			
			res.writeHead(200, {'Content-Type': 'text/html','Content-Length':redirect.length});			
			res.write(redirect);	
			res.end();			  
			  
			tweeter.setConfig(deepCopy(conf));
			delete tweeterTMP;  
		    },oauthAllIn);					    		    
	    break;
	    
	case ('/isAlreadyAuthenticated'):	  	  	   
	  
	    var body = "";
	    req.on('data', function (chunk) {
	      body += chunk;
	    });
	    req.on('end', function () {
		if(body != ""){
		      var reqFrom = cleanSessionID(JSON.parse(body).sessionID);
		      console.log('<isAlreadyAuthenticated, GETted> ' + reqFrom);	      	      
		      
		      //check if the session key sent in the request is already stored in sessionKeys
		      if((sessionKeys[reqFrom]))
		      {
			console.log(sessionKeys[reqFrom].access_token);
			 if(sessionKeys[reqFrom].access_token != "")
			 {
			    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
			    res.write("true");
			    console.log('<isAlreadyAuthenticated, replyed> true');
			 }
			 else
			 {
			    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
			    res.write("false");
			    console.log('<isAlreadyAuthenticated, replyed> false');
			 }
		      }
		      else{
			res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
			res.write("false");
			console.log('<isAlreadyAuthenticated, replyed> false');
		      }
		      res.end();
		}
		else{
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
		res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
		res.end();
		postTweet(tweeter.config, sessionKeys[tweet.sessionID], tweet.tweet);
	      }
	      else{
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
	
		var requestUrl = "https://api.twitter.com/1/friends/ids.json";
		var requestTokenUrl = "https://api.twitter.com/oauth/request_token";
		var access_token = sessionKeys[sessionID].access_token;
		var access_token_secret = sessionKeys[sessionID].access_token_secret;
		console.log(requestUrl);

		var service = new OAuth(requestTokenUrl,
                 		requestTokenUrl, 
                 		tweeter.config.consumerKey, tweeter.config.consumerSecret, 
                 		"1.0A", "", "HMAC-SHA1");

		service.get(requestUrl, access_token, access_token_secret, function(error, data) {
			if (error) {
				console.log('ERROR:' + sys.inspect(error));
				res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
				res.write(false);
				res.end();
			}
			else {
				//getusersinfo

				var baseRequest = "http://api.twitter.com/1/users/lookup.json?user_id=";
				//split the request into batches of 100 persons
				var buffer = "[]";
				console.log (data);
				var ids = JSON.parse(data).ids;
				var sem = 0;
				while (ids.length>0){
					sem++;

					var currentids;
					if (ids.length>100){
						currentids = ids.splice(0,100);
					} else {
						currentids = ids.splice(0,ids.length);
					}
					var request = baseRequest + currentids.join(",");

					service.get(request, access_token, access_token_secret, function(error, users) {
						buffer = buffer.substring(0, buffer.length-1).concat(buffer.length!=2?",":"").concat(users.substring(1, users.length));					sem--;
						if (sem == 0) {
							res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*' });
							res.write(buffer);
							res.end();
						}	
					});
				}
			}
		});


	      }
	      else{
		res.writeHead(403, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
		res.end();
	      }
	      	   	    
	    break;
	    
case ('/getTimeline'):	  	 
	      console.log('<getTimeline, requested:> ');
	          
	      var sessionID = url.parse(req.url).query.split('=')[1];
	      sessionID = sessionID.split('&')[0];
	      sessionID = cleanSessionID(sessionID);

	      if(sessionKeys[sessionID] !== undefined){

		console.log("oAuth getFriends was invoked");	
	
		var requestUrl = "https://api.twitter.com/1/statuses/friends_timeline.json?include_entities=true&count=100";
		var requestTokenUrl = "https://api.twitter.com/oauth/request_token";
		var access_token = sessionKeys[sessionID].access_token;
		var access_token_secret = sessionKeys[sessionID].access_token_secret;
		console.log(requestUrl);

		var service = new OAuth(requestTokenUrl,
                 		requestTokenUrl, 
                 		tweeter.config.consumerKey, tweeter.config.consumerSecret, 
                 		"1.0A", "", "HMAC-SHA1");

		service.get(requestUrl, access_token, access_token_secret, function(error, data) {
			if (error) {
				console.log('ERROR:' + sys.inspect(error));
				res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
				res.write("false");
				res.end();
			}
			else {
				//getusersinfo

				console.log(data);
				res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*' });
				res.write(data);
				res.end()

				
			
			}
		});


	      }
	      else{
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
		      }
		      else{
			res.writeHead(403, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
			res.end();
		      }
		}
		else{
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
                
            }
            else if (/\.(css)$/.test(path)){
            	console.log("<sending> "+__dirname+path+" (type: css)");
            		
           		try {
                   res.writeHead(200, {'Content-Type': 'text/css'});
                   res.write(fs.readFileSync(__dirname + path, 'utf8'));
                   res.end();
           		} catch(e){ send404(res); }
                   
                   break;
            }
            else if (/\.(png)$/.test(path)){
            	console.log("<sending> "+__dirname+path+" (type: png)");
            		
           		try {
                   res.writeHead(200, {'Content-Type': 'img/png'});
                   res.write(fs.readFileSync(__dirname + path));
                   res.end();
           		} catch(e){ send404(res); }
                   
                   break;
            }
            else if (/\.(jpg|jpeg)$/.test(path)){
            	console.log("<sending> "+__dirname+path+" (type: jpg)");
            		
           		try {
                   res.writeHead(200, {'Content-Type': 'img/jpg'});
                   res.write(fs.readFileSync(__dirname + path));
                   res.end();
           		} catch(e){ send404(res); }
                   
                   break;
            }
	    else if (/\.(wsdl|wsd)$/.test(path)){
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

function postTweet(consumerKeys, accessTokens, text){
	console.log("oAuth post was invoked");
	
	console.log(text);
	
	var requestUrl = "https://api.twitter.com/1/statuses/update.json";
	var requestTokenUrl = "https://api.twitter.com/oauth/request_token";
	var access_token = accessTokens.access_token;
	var access_token_secret = accessTokens.access_token_secret;
	var post_body= {"status":text};
	var post_content_type = "";
	console.log(requestUrl);

	var service = new OAuth(requestTokenUrl,
                 		requestTokenUrl, 
                 		consumerKeys.consumerKey, consumerKeys.consumerSecret, 
                 		"1.0A", "", "HMAC-SHA1");

	service.post(requestUrl, access_token, access_token_secret, post_body, post_content_type, function(error, data) {
		if (error) console.log('ERROR:' + sys.inspect(error));
		else console.log(data);
	});
}


function getFriends(consumerKeys, accessTokens){
	console.log("oAuth getFriends was invoked");	
	
	var requestUrl = "https://api.twitter.com/1/friends/ids.json";
	var requestTokenUrl = "https://api.twitter.com/oauth/request_token";
	var access_token = accessTokens.access_token;
	var access_token_secret = accessTokens.access_token_secret;
	console.log(requestUrl);

	var service = new OAuth(requestTokenUrl,
                 		requestTokenUrl, 
                 		consumerKeys.consumerKey, consumerKeys.consumerSecret, 
                 		"1.0A", "", "HMAC-SHA1");

	service.get(requestUrl, access_token, access_token_secret, function(error, data) {
		if (error) console.log('ERROR:' + sys.inspect(error));
		else return data;
	});
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
