import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ChainReactionGame from "./components/GameOffline";

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<ChainReactionGame />} />
                {/* Add more routes as needed */}
            </Routes>
        </Router>
    );
};

export default App;
