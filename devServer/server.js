var sys     =  require('util');
var https    =  require('https');
var url     =  require('url');
var fs      =  require('fs');
var child   =  require('child_process')

var OAuth  =  require('oauth').OAuth;
var conf    =  require('./conf');
var Tweeter =  require('tweeter');
Tweeter.prototype.setConfig = function(config){ this.config = config; };

var tweeter = new Tweeter(deepCopy(conf));

var options = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};

var sessionKeys = {};
 
console.log("\nServer is listening....\n");

https.createServer(options, function(req, res){
		  
    var path = url.parse(req.url).pathname;
    console.log("<req> ", path);
    switch (path){

        case ('/authenticate.html'):       	  
	  
		    var reqFrom = url.parse(req.url).query.split('=')[1];
		    
		    console.log('<authenticate, GETted> ' + reqFrom);
		    
		    //TODO: This crap is needed to overcome missing callbackURL parameter in tweeter.authenticate
		    var sessionCallbackURL = tweeter.config.oauthCallback;
		    tweeter.config.oauthCallback += "?sessionID=" + reqFrom;
		    console.log('<authenticate> setting callbackTo:' + tweeter.config.oauthCallback);
		      
		    tweeter.authenticate(function(err, data){
		      
// 		      console.log(tweeter.getConfig());
			
			//TODO: this is shit indeed..!
 			tweeter.config.oauthCallback = sessionCallbackURL;		
			
			if(err){
			    console.log('<authenticate> Error: ' + err); 
			    return;
			}
			    			    
                        console.log('<authenticate, authUrl> %j', data.authUrl || 'ERROR');						
			
			sessionKeys[reqFrom] = {reqTokenURL: data.authUrl, access_token: "", access_token_secret: "", reqToken: tweeter.config.token, reqTokenSecret: tweeter.config.tokenSecret};		
			
			res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': data.authUrl.length, 'Access-Control-Allow-Origin' : '*' });			
			res.write(data.authUrl);				
			res.end();		
			
		    });		

            break;

        case ('/accessToken.html'):
		    //TODO: close webView. In this example, close spawned child
		    
		    var sessionID = url.parse(req.url).query.split('=')[1];
		    //TODO: just more shit...
		    sessionID = sessionID.split('&')[0];
		    
		    //TODO: thi is the same crap as above...lack of token and tokenSecret parameter in tweeter.getAccessToken 
		    tweeter.config.token = sessionKeys[sessionID].reqToken;
		    tweeter.config.tokenSecret = sessionKeys[sessionID].reqTokenSecret;
		    	    
		    tweeter.getAccessToken( function(self, err, data){

			 if(err){
			    console.log('<accessToken> Error!!!'); 
			    return;
			}
			  console.log('<accessToken,twitterKeys> %j\n', self || 'ERROR');
			  
			  if(sessionKeys[sessionID] != undefined){
 			      sessionKeys[sessionID].access_token = self.config.accessToken;
 			      sessionKeys[sessionID].access_token_secret = self.config.accessTokenSecret;
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
		    });					    		    
	    break;
	    
	case ('/isAlreadyAuthenticated.html'):	  	  	   
	  
	    var body = "";
	    req.on('data', function (chunk) {
	      body += chunk;
	    });
	    req.on('end', function () {
	      var reqFrom = JSON.parse(body).sessionID;
	      console.log('<isAlreadyAuthenticated, POSTed> ' + body);	      	      
	      
	      //check if the session key sent in the request is already stored in sessionKeys
	      if(sessionKeys[reqFrom]){
		res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
		res.write("true");
		console.log('<isAlreadyAuthenticated, replyed> true');
	      }
	      else{
		res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });
		res.write("false");
		console.log('<isAlreadyAuthenticated, replyed> false');
	      }
	      res.end();
	    });
	  		     	  
	    break ;
	    
	case ('/tweet.html'):	  
	  
	    var body = "";
	    req.on('data', function (chunk) {
	      body += chunk;
	    });
	    req.on('end', function () {
	      console.log('<tweet, POSTed:> ' + body);

	      var tweet = JSON.parse(body);	      
	      if(sessionKeys[tweet.sessionID] !== undefined){
		res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });;
		res.end();
		postTweet(tweeter.config, sessionKeys[tweet.sessionID], tweet.tweet);
	      }
	      else{
		res.writeHead(403, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin' : '*' });;
		res.end();
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


function deepCopy(p,c) {
  var c = c||{};
  for (var i in p) {
    if (typeof p[i] === 'object') {
      c[i] = (p[i].constructor === Array)?[]:{};
      deepCopy(p[i],c[i]);
    } else c[i] = p[i];}
  return c;
}
