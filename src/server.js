import app from './app.js';
import { connectDB } from './database/db.js';
import { insertData } from './database/db.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    connectDB();
    insertData();
    console.log(`Server is running at http://localhost:${PORT}`);
});

