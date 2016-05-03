/* jshint node: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true */
"use strict";
var express = require("express");
var app = express();
var nano = require("nano")("http://localhost:5984");
var formidable = require("formidable");
var http = require("http").Server(app);
var io = require("socket.io")(http);

var bodyParser = require("body-parser");
var session = require("express-session");

app.use(bodyParser.json()); // for parsing application/json
app.use(express.static(".")); // serve static files
app.engine("html", require("ejs").renderFile);

var sessionMiddleware = session({
    secret: "keyboard cat", cookie: { maxAge: 5*60*1000 } // sets maximum time for session
});

io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});
app.use(sessionMiddleware);

var sess;

/******************create Database and design docs ********************* */
nano.db.create("offers");
var offers = nano.db.use("offers");
nano.db.create("users");
var users = nano.db.use("users");

users.insert({     
    "views": {
        "viewUsername": {
           "map": "function(doc) {\n  if(doc.username,doc.password){\n    emit(doc.username, doc);\n  }\n}"
        }
    }
}, "_design/desUsername", function (error, response) {
    if(!error){
        console.log("design document created",response);
    }else{
        console.log("design document error");
    }
});
/********************************************************** */

app.get("/", function(req, res){
    res.sendFile(__dirname+"/Client/index.html");
});

app.post("/api/user",function(req,res){
    var user = req.body;
    delete user.passwordconf;
    users.insert(user, null, function (err, response) {
        if (!err) {
            users.get(response.id, { revs_info: false }, function(error, body) {
                if (!error){
                    res.send(body);
                }else{
                    console.log(error);
                    response.end(error);
                }
            });
        }else{
            console.log(err);
            res.end(err);
        }
    });
});

app.patch("/api/user",function(req,res){
    var user = req.body;
    users.insert(user, null, function (err, response) {
        if (!err) {
            users.get(response.id, { revs_info: false }, function(error, body) {
                if (!error){
                    res.send(body);
                }else{
                    console.log(error);
                    response.end(error);
                }
            });
        }else{
            console.log(err);
            res.end(err);
        }
    });
});

app.post("/api/userlogin",function(req,res){
    console.log(req.body);
    if(req.body.username){
        users.view("desUsername","viewUsername",{ keys : [req.body.username] },function(err,body){
            if(!err){
                if(body.rows.length === 1 && body.rows[0].value.password === req.body.password){
                    sess = req.session;
                    sess.user = body.rows[0].value;
                    sess.username = body.rows[0].value.username;
                    res.send(body.rows[0].value);
                }else{
                    res.send({"result" : "login failed"});
                }
            }else{
                res.end();
            }
        });
    } else if(req.body.usernameCookie){
        sess = req.session;
        // check if session exist
        if( sess.user && sess.user._id === req.body.usernameCookie){
            users.get(req.body.usernameCookie, { revs_info: true }, function (err, body) {
                if (!err){
                    console.log(body);
                    sess = req.session;
                    sess.user = body;
                    sess.username = body.username;
                    res.send(body);
                }
            });
        }else{
            res.send("Session Timed out");
        }
    }
});

app.get("/api/logout", function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
});

app.get("/api/offers",function(req,res){
    /**Lists all documents in the db */
    offers.list({include_docs:true},function (err, body) {
        if (!err) {
            //console.log(body.rows);
            res.send(body.rows);
        }
    });
});

app.post("/api/offer",function(req,res){
    sess=req.session;
    // check if session exists
    if(sess.user){
        var form = new formidable.IncomingForm();
        var offer = {};
        var imagePath = "";
        form.uploadDir = __dirname +"/uploads";
        form.parse(req, function(err, fields, files) {
            //you can get fields here
            console.log("parse field : ",fields,files);
        });
        
        form.on("field", function(name, value) {
            if(name === "data"){
                console.log("Value :" , JSON.parse(value));
                offer = JSON.parse(value);
                //console.log("Value :" , offer.title);
            }
        });
        
        form.on("fileBegin", function(name, file){
            file.path = form.uploadDir + "/" + file.name;
            imagePath = "/uploads/" + file.name;
            console.log("fileBegin : ", file);
            //modify file path
        });
        
        form.on("progress", function(bytesReceived, bytesExpected) {
            var percent_complete = (bytesReceived / bytesExpected) * 100;
            console.log("Progress : ", percent_complete.toFixed(2));
        });
        
        form.on("end", function(){
            //when finish all process
            // inser document with image url
            offers.insert({ title: offer.title, price: offer.price, description: offer.description, category: offer.category, user: offer.user, imagePath: imagePath, isSold: false }, null, function (err, response) {
                if (!err) {
                    console.log(response);
                    offers.get(response.id, { revs_info: true }, function (err, body) {
                        if (!err) {
                            console.log(body);
                            res.send(body);
                        }
                    });
                } else {
                    console.log(err);
                    res.send(err);
                }
            });
        });
    }else{
        res.send("Session Timed out");
    }
});

app.patch("/api/offer",function(req,res){
    sess=req.session;
    // check if session exists
    if(sess.user){
        console.log( "input: ", req.body);
        var newOffer = req.body;
        delete newOffer.isFavorite;
        delete newOffer.makeofferDiv;
        delete newOffer.myOffer;
        console.log( "newOffer: ", newOffer);
        offers.insert(newOffer, null, function (err, response) {
            if (!err) {
                //console.log(response);
                offers.get(response.id, { revs_info: false }, function(error, body) {
                    if (!error){
                        //console.log(body);
                        res.send(body);
                    }else{
                        console.log(error);
                        response.end(error);
                    }
                });
            }else{
                console.log(err);
                res.end(err);
            }
        });
    }else{
        res.send("Session Timed out");
    }
});
var clients = [];
var usersList = [];

io.on("connection", function(socket){
    console.log("a user connected");
    
    socket.on("startSession", function(msg){
        console.log("message: " + msg);
        var req = socket.request;
        if(req.session){
            usersList[req.session.username] = socket.id; // connected user with its socket.id
            clients[socket.id] = socket; // add the client data to the hash
            console.log(req.session.username + " connected with session id: "+ req.session.id);
            clients[usersList[req.session.username]].emit("startSession","Hello "+ req.session.username +", how've you been");
        }else{
            console.log("an unknown user connected");
        }
    });
    
    socket.on("disconnect", function(){
        var req = socket.request;
        if(req.session){
            delete clients[socket.id]; // remove the client from the array
            delete usersList[req.session.username]; // remove connected user & socket.id
        }
        console.log("user disconnected");
    });
});

app.get("/api", function (req, res) {
    var doc = "<table><th>Method</th><th>Path</th>";
    app._router.stack.forEach(function(element) {
        if(element.route !== undefined ){
            for (var key in element.route.methods){
                if(key){
                    doc += "<tr><td>"+ key +"</td><td>"+ element.route.path +"</td></tr>";
                }
            }
        }
    }, this);
    doc += "</table>";   
    console.log(doc);
    res.send(doc);
});

http.listen(5000, function () {
  console.log("HandItOver app listening on port 5000!");
});
