var express = require("express");
var bodyParser = require('body-parser');
var mysql = require('mysql');
var session = require('express-session');
var fs = require('fs');
var crypto = require('crypto');
var qr = require('qr-image');

var conn = mysql.createConnection({
    host    :   'localhost',
    user    :   'root',
    password:   'sisi',
    database:   'youngh'
});

var app = express();
var port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use('/user', express.static(__dirname+'/user'));
app.use('/', function(req,res,next){
    console.log('Request Url : ' + req.url);
    next();
});
app.use(session({
    secret: '@!@#FBADFA',
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');

app.get('/', function(req,res){
    var user_id = req.session.user_id;
    res.render('index', {user_id:user_id});
});

// Sign up process
app.route('/member/signup')
    .get(function(req, res){
        res.render('signup');
    })
    .post(function(req,res){

        var id = req.body.id;
        var pw = req.body.pw;

        var data = [id,pw];

        var query = "INSERT INTO `member` VALUES (?,?);";
        conn.query(query, data, function(){
            console.log("Success insert data");
            fs.mkdir(__dirname+"/user/"+id, function(){ // create directory
                res.redirect('/member/signin');
            });
        });
    });

// Sign in process
app.route('/member/signin')
    .get(function(req,res){
        res.render('signin');
    })
    .post(function(req,res){
        var id = req.body.id;
        var pw = req.body.pw;

        var data = [id,pw];

        var query = "SELECT * FROM `member` WHERE id=? AND pw=?;";
        conn.query(query, data, function(err,rows){
            if(err) throw err;
            if(rows.length){
                var id = rows[0].id;
                var pw = rows[0].pw;

                var hour = 3600000;
                req.session.cookie.expires = new Date(Date.now() + hour);
                req.session.cookie.maxAge = hour;

                req.session.user_id = rows[0].id;

                req.session.save(function(){
                    res.redirect('/');
                });
            }
        });
    });

// Door lock insert
app.route('/qrock/register')
    .get(function(req,res){
        res.render('qrock/register');
    })
    .post(function(req,res){
        var qrock_id = req.body.qrock_id;
        var qrock_name = req.body.qrock_name;
        var user_id = req.session.user_id;

        // Encrypt
        var now_date = new Date(Date.now()); // now date
        var ency_pass = user_id + now_date;
        var qrock_pass = crypto.createHash('sha256').update(ency_pass).digest('base64');

        // QRCode create image and save
        var qr_png = qr.image(qrock_pass, { type: 'png' });
        var qr_name = "qrcode.png";
        var qr_path = user_id+"/"+qrock_id+"/"+qr_name;

        var data = [qrock_id,qrock_pass,qrock_name,qr_path,user_id];

        var query = "INSERT INTO `qrock` (`qrock_id`,`qrock_pass`,`qrock_name`,`qrock_path`,`user_id`) VALUES(?,?,?,?,?);";
        conn.query(query, data, function(err){
            if(err) throw err;
            fs.mkdir(__dirname+"/user/"+req.session.user_id+"/"+qrock_id, function(){
                qr_png.pipe(fs.createWriteStream(__dirname+"/user/"+qr_path));
                res.redirect('/');
            });
        });
    });

// 도어락 리스트
app.get('/qrock/list', function(req,res){

    var user_id = req.session.user_id;
    var data = [user_id];

    var query = "SELECT * FROM `qrock` WHERE user_id = ?;";
    conn.query(query, data , function(err,rows){
        if(err) throw err;
        res.render('qrock/list', {rows:rows});
    })
});

app.get('/qrock/view', function(req,res){
    
    var user_id = req.session.user_id;
    var qrock_id = req.query.qrock_id;

    var data = [qrock_id,user_id];

    console.log(data);

    var query = "SELECT * FROM `qrock` WHERE qrock_id = ? AND user_id = ?;";
    conn.query(query, data , function(err,rows){
        if(err) throw err;
        res.render('qrock/view', {rows:rows});
    });

});

app.listen(port, function(){
    console.log('Running Server 127.0.0.1:' + port);
});