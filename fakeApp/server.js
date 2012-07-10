var sys     =  require('util');
var http    =  require('http');
var url     =  require('url');
var fs      =  require('fs');

console.log("\nServer is listening....\n");
 
http.createServer(function(req, res){		
		  

    var path = url.parse(req.url).pathname;
    console.log("<req> ", path);
    switch (path){

        case ('/'):
        
 		    fs.readFile('index.html',function (err, data){
 		        res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
  		        res.write(data);				
  		        res.end();
 
 		    });
		    
            break;

        case ('/favicon.ico'):
		   res.writeHead(200);
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
}).listen(9090, "localhost");

function send404(res){
    res.writeHead(404, {"Content-Type": "text/plain"});
    res.write("404 Not found");
    res.end();
}

