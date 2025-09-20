import express, { json } from 'express'
import cors from 'cors'
import { MongoClient, ObjectId }  from 'mongodb';

const app = express();
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({extended: true}));


const uri = "mongodb+srv://kuruvarajesh:Kuruva123456@rajeshcluster.lsonlui.mongodb.net/?retryWrites=true&w=majority&appName=RajeshCluster";
const client = new MongoClient(uri);

let db, vehiclesCol, bookingsCol;

async function init() {
  await client.connect();
  db = client.db('fleetlink');
  vehiclesCol = db.collection('vehicles');
  bookingsCol = db.collection('bookings');
  console.log('Connected to MongoDB');
}
init();

// calculate ride duration
function estimateDuration(from, to) {
  return Math.abs(parseInt(to) - parseInt(from)) % 24;
}

// vehicles
app.post('/api/vehicles', async (req, res) => {
  try {
    const { name, capacityKg, tyres } = req.body;
    if (!name || !capacityKg || !tyres) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const result = await vehiclesCol.insertOne({ name, capacityKg: +capacityKg, tyres: +tyres });
    const vehicle = await vehiclesCol.findOne({ _id: result.insertedId });
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// vehicles available
app.get('/api/vehicles/available', async (req, res) => {
  try {
    const { capacityRequired, fromPincode, toPincode, startTime } = req.query;
    const start = new Date(startTime);
    const hours = estimateDuration(fromPincode, toPincode);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

    const vehicles = await vehiclesCol
      .find({ capacityKg: { $gte: Number(capacityRequired) } })
      .toArray();

    const bookings = await bookingsCol
      .find({ startTime: { $lt: end }, endTime: { $gt: start } })
      .toArray();

    const bookedIds = bookings.map(b => b.vehicleId.toString());
    const available = vehicles.filter(v => !bookedIds.includes(v._id.toString()));

    res.json(
      available.map(v => ({
        ...v,
        estimatedRideDurationHours: hours,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// bookings
app.post('/api/bookings', async (req, res) => {
  try {
    const { vehicleId, fromPincode, toPincode, startTime, customerId } = req.body;

    const vehicle = await vehiclesCol.findOne({ _id: new ObjectId(vehicleId) });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const start = new Date(startTime);
    const hours = estimateDuration(fromPincode, toPincode);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

    const overlap = await bookingsCol.findOne({
      vehicleId: new ObjectId(vehicleId),
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (overlap) return res.status(409).json({ error: 'Vehicle already booked' });

    const result = await bookingsCol.insertOne({
      vehicleId: new ObjectId(vehicleId),
      fromPincode,
      toPincode,
      startTime: start,
      endTime: end,
      customerId,
    });

    const booking = await bookingsCol.findOne({ _id: result.insertedId });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Backend running on http://localhost:5000'));
