
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Start from './pages/Start';
import Login from './pages/Login';
import Respond from './pages/Respond';
import Archive from './pages/Archive';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/start" element={<Start />} />
        <Route path="/login" element={<Login />} />
        <Route path="/r/:token" element={<Respond />} />
        <Route path="/archive" element={<Archive />} />
      </Routes>
    </div>
  );
}

export default App;
