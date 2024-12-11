CREATE TABLE household (
    household_id SERIAL PRIMARY KEY, -- Auto-incrementing ID
    household_name VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    username VARCHAR(50) NOT NULL PRIMARY KEY,
    password CHAR(60) NOT NULL,
    household_id INTEGER REFERENCES household(household_id), -- Refers to auto-incremented ID
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE, -- Ensure unique emails
    timestamp TIMESTAMP DEFAULT NOW(),
    profile_image VARCHAR(255) DEFAULT 'img/user.jpg'
);

CREATE TABLE chores (
    chore_id SERIAL PRIMARY KEY, -- Auto-incrementing chore ID
    username VARCHAR(50) NOT NULL,
    household_id INTEGER NOT NULL,  -- Match SERIAL type from household table
    chore_name VARCHAR(50) NOT NULL,
    chore_description VARCHAR(255) NOT NULL,
    completion_status BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT NOW(),
    due_date TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY (username)
        REFERENCES users(username)
        ON DELETE CASCADE, -- Automatically delete chores if the user is deleted
    CONSTRAINT fk_household
        FOREIGN KEY (household_id)
        REFERENCES household(household_id)
        ON DELETE CASCADE -- Automatically delete chores if the household is deleted
);

