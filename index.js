const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
      // 'http://localhost:5173',
      'https://car-doctor-ashiq.web.app',
      'https://car-doctor-ashiq.firebaseapp.com',
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.igno3bw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware for JWT

const logger = async (req, res, next) => {
  console.log('Log info:', req.method, req.url);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  console.log('this token from middleware =', token);
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const orderCollection = client.db('carDoctor').collection('orders');

    // auth related API

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        })
        .send({ success: true });
    });

    app.post('/logout', (req, res) => {
      const user = req.body;
      console.log(user);
      res
        .clearCookie('token', { maxAge: 0, secure: true, sameSite: 'none' })
        .send({ success: true });
    });

    // Service related apis
    // service get
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // service get by id
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, img: 1, price: 1, service_id: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    // booking get by query
    app.get('/orders', logger, verifyToken, async (req, res) => {
      // console.log('token getting', req.cookies.token);
      // console.log('token information of this user', req.user);
      // if (req.query?.email !== req.user.email) {
      //   return res.status(403).send({ message: 'forbidden' });
      // }
      console.log('request token owner info:', req.user);
      if (req.user.email !== req.query.email) {
        return res.status(401).send({ message: 'forbidden' });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    // Booking post
    app.post('/orders', async (req, res) => {
      const booking = req.body;
      const result = await orderCollection.insertOne(booking);
      res.send(result);
    });

    // booking delete
    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // booking update pending to approved
    app.patch('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateOrder = req.body;
      const updateDoc = {
        $set: {
          status: updateOrder.status,
        },
      };
      const result = await orderCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Car doctor is running');
});

app.listen(port, () => {
  console.log(`Car doctor is running on port: ${port}`);
});
