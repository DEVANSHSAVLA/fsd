const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3018;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'voting_db.json');

// Initialize database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      voters: [],
      candidates: [
        {
          "id": "cand_1",
          "name": "Jane Adams",
          "party": "Green Alliance Party",
          "symbol": "🦅",
          "bio": "Championing environmental sustainability, clean energy grids, and green job development plans for the local districts.",
          "votes": 0
        },
        {
          "id": "cand_2",
          "name": "Marcus Vance",
          "party": "United Coalition Party",
          "symbol": "🦁",
          "bio": "Focusing on local business credits, economic expansion, tax reliefs, and digital tech infrastructure investments.",
          "votes": 0
        },
        {
          "id": "cand_3",
          "name": "Leo Sterling",
          "party": "Independent Democratic Council",
          "symbol": "🐘",
          "bio": "Advocating for student loan supports, healthcare access expansions, and public transit connectivity programs.",
          "votes": 0
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. Register voter (verification age >= 18)
app.post('/api/auth/register', (req, res) => {
  const { username, age, ssn, password } = req.body;
  if (!username || !age || !ssn || !password) {
    return res.status(400).json({ error: 'All registration parameters are required.' });
  }

  if (parseInt(age) < 18) {
    return res.status(400).json({ error: 'Age eligibility check failed. Voters must be 18 or older.' });
  }

  const db = readDB();
  
  // Duplicate Username check
  if (db.voters.some(v => v.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Voter Username already registered.' });
  }

  // Duplicate SSN check
  if (db.voters.some(v => v.ssn === ssn)) {
    return res.status(400).json({ error: 'National ID / SSN has already been registered.' });
  }

  const newVoter = {
    id: 'voter_' + Math.floor(10000 + Math.random() * 90000),
    username,
    age: parseInt(age),
    ssn,
    password,
    voted: false
  };

  db.voters.push(newVoter);
  writeDB(db);

  res.json({ success: true });
});

// 2. Login voter
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();

  const voter = db.voters.find(v => v.username.toLowerCase() === username.toLowerCase() && v.password === password);
  if (!voter) {
    return res.status(401).json({ error: 'Invalid voter username or credentials.' });
  }

  res.json({
    success: true,
    voter: {
      id: voter.id,
      username: voter.username,
      voted: voter.voted
    }
  });
});

// 3. Get candidates list
app.get('/api/candidates', (req, res) => {
  const db = readDB();
  res.json(db.candidates);
});

// 4. Cast ballot vote
app.post('/api/vote', (req, res) => {
  const { voterId, candidateId } = req.body;
  if (!voterId || !candidateId) {
    return res.status(400).json({ error: 'Missing voting parameters.' });
  }

  const db = readDB();
  const voter = db.voters.find(v => v.id === voterId);

  if (!voter) {
    return res.status(404).json({ error: 'Voter profile not found in ledger.' });
  }

  if (voter.voted) {
    return res.status(400).json({ error: 'Identity check failed: Ballot has already been cast for this Voter ID.' });
  }

  const candidate = db.candidates.find(c => c.id === candidateId);
  if (!candidate) {
    return res.status(404).json({ error: 'Nominated candidate not found.' });
  }

  // Cast vote
  voter.voted = true;
  candidate.votes += 1;

  writeDB(db);
  res.json({ success: true });
});

// 5. Live results calculus
app.get('/api/results', (req, res) => {
  const db = readDB();
  const totalVotes = db.candidates.reduce((sum, c) => sum + c.votes, 0);

  const results = db.candidates.map(c => ({
    id: c.id,
    name: c.name,
    party: c.party,
    symbol: c.symbol,
    votes: c.votes,
    percentage: totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0
  }));

  res.json({ totalVotes, results });
});

app.listen(PORT, () => {
  console.log(`Voting System Server running on http://localhost:${PORT}`);
});
