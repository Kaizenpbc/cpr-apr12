        // hashPassword.js
        const bcrypt = require('bcrypt');
        const plainPassword = 'test123'; // <--- CHANGE THIS
        const saltRounds = 10;

        bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
            if (err) {
                console.error("Error hashing password:", err);
            } else {
                console.log("Plain Password:", plainPassword);
                console.log("BCrypt Hash:", hash);
            }
        });