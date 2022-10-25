const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { Double, Db } = require('mongodb');
app.use(bodyParser.urlencoded({ extended: true}));
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override');
const { request } = require('express');
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
require('dotenv').config();

app.use('/public', express.static('public')); // 나는 public 폴더를 쓸거다.

var db;
MongoClient.connect(process.env.DB_URL, function(err, client) {
  if (err) { return console.error(err); }

  db = client.db('todoapp');

  app.listen(8080, function() {
    // 서버띄울 포트 번호, 띄운 후 실행할 코드
    console.log('listening on 8080');
  });
})

app.get('/', function(req, res) {
  res.render('index.ejs');
});

app.get('/write', function(req, res) {
  res.render('write.ejs')
});



app.get('/list', function(req, res) {
  db.collection('post').find().toArray(function(err, result) {
    console.log(result);
    res.render('list.ejs', { posts: result})
  });
});

app.get('/search', (req, res) => {
  var searchCondition = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: req.query.value,
          path: 'title'
        }
      }
    }
  ]

  db.collection('post').aggregate(searchCondition).toArray((err, result) => {
    console.log(result);
    res.render('search.ejs', { posts: result})
  })
})



app.get('/detail/:id', function(req, res) {
  db.collection('post').findOne({ _id: parseInt(req.params.id) }, function(err, result) {
    res.render('detail.ejs', { data: result});
  })
});

app.get('/edit/:id', function(req, res) {
  db.collection('post').findOne({ _id: parseInt(req.params.id) }, function(err, result) {
    res.render('edit.ejs', { post: result });
  })
});

app.put('/edit', function(req, res) {
  db.collection('post').updateOne({ _id: parseInt(req.body.id) }, { $set : { title: req.body.title, date: req.body.date} }, function(err, result) {
    console.log('수정 완료');
    res.redirect('/list');
  })
});

const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const router = require('./routes/shop');

app.use(session({secret: 'secret', resave: true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function(req, res) {
  res.render('login.ejs')
});

app.post('/login', passport.authenticate('local', {
  failureRedirect: '/fail'
}),  function(req, res) {
  res.redirect('/');
});

app.get('/mypage', isLogin, function(req, res) {
  res.render('mypage.ejs', { id: req.user });
})

function isLogin(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send('로그인 안했습니다.');
  }
}

// app.get();

passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (userId, userPwd, done) { // id pw 검증 
  //console.log(입력한아이디, 입력한비번);
  db.collection('login').findOne({ id: userId }, function (err, result) {
    if (err) return done(err)

    if (!result) return done(null, false, { message: '존재하지않는 아이디요' })
    if (userPwd == result.pw) {
      return done(null, result)
    } else {
      return done(null, false, { message: '비번틀렸어요' })
    }
  })
}));

passport.serializeUser(function (user, done) {
  done(null, user.id)
});

passport.deserializeUser(function (userId, done) {
  // db에서 user의 정보 찾음
  db.collection('login').findOne({ id: userId }, function(err, result) {
    done(null, result)
  })
}); 

app.post('/register', function(req, res) {
  db.collection('login').insertOne({ id: req.body.id, pw: req.body.pw }, function(err, result) {
    res.redirect('/');
  })
});

app.post('/add', function(req, res) {
  // 사용자가 input에 적은 정보는 req에 저장되어있음
  res.send('전송완료');
  db.collection('counter').findOne({ name: 'boardCount' }, function(err, result) {
    console.log(totalPostNum);
    var totalPostNum = result.totalPost;
    db.collection('post').insertOne({ _id: totalPostNum + 1, title: req.body.title, date: req.body.date, author: req.user._id }, function(err, result) {
      console.log('저장완료');
      
      db.collection('counter').updateOne({ name: 'boardCount' }, { $inc: { totalPost: 1 } }, function(err, result) {
        if (err) { return console.error(err); }
      })
    });

  });
});

app.delete('/delete', function(req, res) {
  req.body._id = parseInt(req.body._id);
  // req.body에 담겨온 게시물 번호를 가진 글을 db에서 찾아서 삭제
  db.collection('post').deleteOne({ _id: req.body._id, author: req.user._id }, function(err, result) { // req.body가 { ._id : ~~ } 형태임.
    console.log('삭제완료');
    if (err) {console.log(err)}
    res.status(200).send({ message: '성공했습니다' });
  })
});

router.use(isLogin);

app.use('/shop', require('./routes/shop.js'))