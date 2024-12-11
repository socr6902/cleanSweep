// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added
// const bcrypt = require('bcrypt');
// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************


// describe('Testing Redirect', () => {
//   // Sample test case given to test /test endpoint.
//   it('\test route should redirect to /login with 302 HTTP status code', done => {
//     chai
//       .request(server)
//       .get('/test')
//       .end((err, res) => {
//         res.should.have.status(200); // Expecting a redirect status code
//         res.should.redirectTo(/^.*127\.0\.0\.1.*\/login$/); // Expecting a redirect to /login with the mentioned Regex
//         done();
//       });
//   });
// });

// // create a cookies variable
// var cookies;

// describe('Login', () => {
//   // Sample test case given to test / endpoint.
//   it('Returns the default welcome message', done => {
//     chai
//       .request(server)
//       .get('/login')
//       .end((err, res) => {
//         // expect statements
//         cookies = res.headers['set-cookie'].pop().split(';')[0]; // save the cookies
//         done();
//       });
//   });
// });

// describe('Home', () => {
//   // Sample test case given to test / endpoint.
//   it('Returns the default logout message', done => {
//     chai
//       .request(server)
//       .get('/logout')
//       .set('cookie', cookies) // set the cookie in the request
//       .end((err, res) => {
//         // expect statements
//         done();
//       });
//   });
// });


// // ********************************************************************************