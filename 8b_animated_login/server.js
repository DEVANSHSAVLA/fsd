const express = require('express');
const path = require('path');
const app = express();
const PORT = 3023;

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});
