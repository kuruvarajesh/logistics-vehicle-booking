import React, { useState } from 'react';
import './App.css';

function App() {
  const [vehicle, setVehicle] = useState({ name: '', capacityKg: '', tyres: '' });
  const [search, setSearch] = useState({ capacityRequired: '', fromPincode: '', toPincode: '', startTime: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addVehicle = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      });
      if (!res.ok) throw new Error('Failed to add vehicle');
      alert('Vehicle added!');
      setVehicle({ name: '', capacityKg: '', tyres: '' });
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const searchVehicles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(search);
      const res = await fetch(`http://localhost:5000/api/vehicles/available?${params}`);
      if (!res.ok) throw new Error('Search Failed');
      const data = await res.json();
      setResults(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const bookVehicle = async (id) => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: id,
          ...search,
          customerId: 'CUST001',
        }),
      });
      if (res.status === 409) {
        alert('Vehicle became unavailable, try again.');
      } else if (!res.ok) {
        throw new Error('Booking failed');
      } else {
        alert('Booking confirmed!');
        searchVehicles();
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>FleetLink</h1>

      <section>
        <h2>Add Vehicle</h2>
        <input
          placeholder="Name"
          value={vehicle.name}
          onChange={e => setVehicle({ ...vehicle, name: e.target.value })}
        />
        <input
          placeholder="Capacity (Kg)"
          type="number"
          value={vehicle.capacityKg}
          onChange={e => setVehicle({ ...vehicle, capacityKg: e.target.value })}
        />
        <input
          placeholder="Tyres"
          type="number"
          value={vehicle.tyres}
          onChange={e => setVehicle({ ...vehicle, tyres: e.target.value })}
        />
        <button onClick={addVehicle} disabled={loading}>Add</button>
      </section>

      <section>
        <h2>Search & Book</h2>
        <input
          placeholder="Capacity Required"
          value={search.capacityRequired}
          onChange={e => setSearch({ ...search, capacityRequired: e.target.value })}
        />
        <input
          placeholder="From Pincode"
          value={search.fromPincode}
          onChange={e => setSearch({ ...search, fromPincode: e.target.value })}
        />
        <input
          placeholder="To Pincode"
          value={search.toPincode}
          onChange={e => setSearch({ ...search, toPincode: e.target.value })}
        />
        <input
          type="datetime-local"
          value={search.startTime}
          onChange={e => setSearch({ ...search, startTime: e.target.value })}
        />
        <button onClick={searchVehicles} disabled={loading}>Search</button>

        <ul className="results">
          {results.map(r => (
            <li key={r._id} className="card">
              <div>
                <strong>{r.name}</strong> – {r.capacityKg}Kg – {r.tyres} tyres
              </div>
              <div>Duration: {r.estimatedRideDurationHours}h</div>
              <button onClick={() => bookVehicle(r._id)} disabled={loading}>Book Now</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
