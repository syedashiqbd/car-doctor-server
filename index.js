const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');

require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ['http://localhost:5173'],
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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings');

    // auth related
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1hr',
      });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
        })
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
    app.get('/bookings', async (req, res) => {
      console.log('token getting', req.cookies.token);

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // Booking post
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // booking delete
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // booking update pending to approved
    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateOrder = req.body;
      const updateDoc = {
        $set: {
          status: updateOrder.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
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