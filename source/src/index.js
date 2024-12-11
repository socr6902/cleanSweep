// ----------------------------------   DEPENDENCIES  ----------------------------------------------
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // HTTP client


// ----------------------------------- START THE SERVER ------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// -------------------------------------  APP CONFIG   ----------------------------------------------

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
// set Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true, 
    resave: true,
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
const publicDirectoryPath = path.join(__dirname, 'src', 'resources');
app.use(express.static(publicDirectoryPath));

// -------------------------------------  DB CONFIG AND CONNECT   ---------------------------------------
const dbConfig = {
  host: 'db',
  port: 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};
const db = pgp(dbConfig);

// db test
db.connect()
  .then(obj => {
    // Can check the server version here (pg-promise v10.1.0+):
    console.log('Database connection successful');
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR', error.message || error);
  });

// ----------------------------------- ROUTES -----------------------------------------------------

// ---------- static images ----------- //

app.use((req, res, next) => {
  console.log(`Request URL: ${req.url}`);
  next();
});

app.use('/resources', express.static(path.join(__dirname, 'src', 'resources')));


app.use('/resources', express.static(path.join(__dirname, 'src', 'resources')));


// ----- default route ------

app.get('/', (req, res) => {
  res.redirect('/register'); //this will call the /anotherRoute route in the API
});

// ----- home route --------

app.get('/pages/home', async (req, res) => {
  // Check if the user is logged in
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    // Fetch chores and users data
    const data = await fetchChoresAndUsersData(req);

    // If household_id is null, redirect to the join page
    if (data.redirect) {
      return res.redirect(data.redirect);
    }

    // Render the homepage with chores and users data
    res.render('pages/home', { chores: data.chores, users: data.users });
  } catch (err) {
    res.status(500).send('Internal server error');
  }
});





// ROUTE TO HANDLE RENDERING HOME PAGE QUERIES

app.get('/household/chore-data', async (req, res) => {
  // Check if the user is logged in
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' }); // Return 401 if not logged in
  }

  try {
    // Query the database for the logged-in user's household_id
    const user = await db.oneOrNone('SELECT household_id FROM users WHERE username = $1', [req.session.user.username]);

    // If household_id is null, return a message to redirect the user
    if (!user.household_id) {
      return res.status(200).json({ redirect: '/join' });
    }

    // Retrieve the household chores
    const chores = await db.any(`
      SELECT 
        c.chore_id,
        c.chore_name,
        c.chore_description,
        c.completion_status,
        c.due_date,
        u.username,
        h.household_name
      FROM 
        chores c
      JOIN 
        users u ON c.username = u.username
      JOIN 
        household h ON c.household_id = h.household_id
      WHERE 
        c.household_id = $1
    `, [user.household_id]);

    // Return the chores data
    res.status(200).json({ chores });
  } catch (err) {
    console.error('Error retrieving chore data:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/household/:household_id/users', async (req, res) => {
  const { household_id } = req.params;

  try {
    // Query to get all users in the specified household
    const users = await db.any('SELECT username, first_name, last_name, profile_image FROM users WHERE household_id = $1', [household_id]);

    res.status(200).json(users); // Send the list of users to the front-end
  } catch (err) {
    console.error('Error fetching household users:', err);
    res.status(500).send('Error fetching users');
  }
});

// ----- login route ---------

app.get('/login', (req, res) => {
  console.log('opening login page')
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // Query to find user by username
  const query = 'SELECT * FROM users WHERE username = $1 LIMIT 1';
  console.log(username);
  const values = [username];

  try {
      // Retrieve user from the database
      const user = await db.oneOrNone(query, values);

      if (!user) {
          // User not found, render login page with error message
          return res.redirect('/register');
      }

      // Compare password
      const passwordMatch = await bcrypt.compare(req.body.password, user.password);

      if (!passwordMatch) {
          // Incorrect password, render login page with error message
          return res.render('pages/login', { message: 'Incorrect password' });
      }

      // Save user in session
      req.session.user = user;
      req.session.save();

      // Redirect to home page
      res.redirect('/pages/home');
  } catch (err) {
      // Error occurred, redirect to login page
      console.log(err);
      res.redirect('/register');
  }
});

// ------ register route -------

app.get('/register', (req, res) => {
  res.render('pages/register');
})
// Register
app.post('/register', async (req, res) => {
  const { first_name, last_name, username, password, email } = req.body;

  // Check if username, password, etc., are empty
  if (!username || !password || !first_name || !last_name || !email) {
    return res.status(406).render('pages/register', { message: 'Name, Username, password, and email are required.' });
  }

  try {
    // Ping database for existing username
    const userExists = await db.oneOrNone('SELECT username FROM users WHERE username = $1', [username]);

    if (userExists) {
      return res.status(406).render('pages/register', { message: 'Username already exists. Please choose another one.' });
    }

    // Hash the password using bcrypt
    const hash = await bcrypt.hash(password, 10);
    
    // Insert new user into users table
    await db.none(
      'INSERT INTO users (first_name, last_name, username, password, email) VALUES ($1, $2, $3, $4, $5)',
      [first_name, last_name, username, hash, email]
    );
    
    console.log("Registered User");
    res.status(200).redirect('/login');
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(406).render('pages/register', { message: 'Error Registering User' });
  }
});

// ---------- logout route ---------- //

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('pages/logout');
});

// ---------- household key logic routes ---------//

// ---------- create a household --------- //


app.post('/create-household', async (req, res) => {
  const { username } = req.body;

  try {
      // Insert the household, let PostgreSQL handle the household_id
      const household = await db.one(
          'INSERT INTO household (household_name) VALUES ($1) RETURNING household_id',
          [username + "'s Household"]
      );

      // Assign the generated household_id to the user
      await db.none('UPDATE users SET household_id = $1 WHERE username = $2', [household.household_id, username]);

      // Inform the user of the generated household ID
      //res.status(200).send(`Household created successfully. Your Household ID is: ${household.household_id}. Share this ID with your friends.`);
      res.redirect('/pages/home');
  } catch (err) {
      console.error('Error creating household:', err);
      res.status(500).send('Error creating household');
  }
});



// ---------- join a household --------- //

app.post('/join-household', async (req, res) => {
  const { username, household_id } = req.body;

  try {
      // Check if the household_id exists
      const household = await db.oneOrNone('SELECT household_id FROM household WHERE household_id = $1', [household_id]);

      if (!household) {
          return res.status(404).send('Household ID not found.');
      }

      // Assign the user to the existing household
      await db.none('UPDATE users SET household_id = $1 WHERE username = $2', [household_id, username]);

      // Redirect to the homepage
      res.redirect('/pages/home');
  } catch (err) {
      console.error('Error joining household:', err);
      res.status(500).send('Error joining household');
  }
});

app.get('/join', (req, res) => {
  // Render the page where the user can create or join a household
  res.render('pages/join');
});

// ------------- household route --------------- //
app.get('/house', (req, res) => {
  console.log('opening household page')
  res.render('pages/house');
})

// ------------- chores route --------------- //
app.get('/chores', async (req, res) => {
  console.log('Opening chores page');
  
  try {
    // Fetch chores and users data
    const data = await fetchChoresAndUsersData(req);

    // If household_id is null, redirect to the join page
    if (data.redirect) {
      return res.redirect(data.redirect);
    }

    // Render the chores page with chores and users data
    res.render('pages/chores', { chores: data.chores, users: data.users });
  } catch (err) {
    res.status(500).send('Internal server error');
  }
});

// ------------- account route --------------- //
app.get('/account', (req, res) => {
  console.log('opening account page')
  res.render('pages/account');
})

// ----------- fucntion to fethc user and chore data //

async function fetchChoresAndUsersData(req) {
  try {
    // Query the database for the logged-in user's household_id
    const user = await db.oneOrNone('SELECT household_id FROM users WHERE username = $1', [req.session.user.username]);

    // If household_id is null, return an object indicating redirection is necessary
    if (!user.household_id) {
      return { redirect: '/join' };
    }

    // Fetch the household chore data and user data concurrently
    const [choreResponse, userResponse] = await Promise.all([
      axios.get('http://localhost:3000/household/chore-data', {
        headers: { Cookie: req.headers.cookie },
      }),
      axios.get(`http://localhost:3000/household/${user.household_id}/users`, {
        headers: { Cookie: req.headers.cookie },
      }),
    ]);

    // Return the data needed for rendering
    return { chores: choreResponse.data.chores, users: userResponse.data };
  } catch (err) {
    console.error('Error fetching chores and users data:', err);
    throw err; // Re-throw the error to handle in each route as needed
  }
}

