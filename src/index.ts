import express from "express"; //Importing the express
import path from "path/posix";
import http from "http";
import { Server } from "socket.io";
import connectDb from "./db/Dbconnect";
import routes from "./routes";
import cors from "cors";
require("dotenv").config(); //The dotenv for env usage

/**
 * The app instance
 */
let app = express();

//Validating json usage
app.use(express.json());

//Disabling cors
app.use(cors());

//User
declare global {
  namespace Express {
    export interface Request {
      user?: any;
    }
  }
}

/**
 * Creating an http server
 */
let server = http.createServer(app);
//Implemented the server in the socket
const io = new Server(server, {
  transports: ["polling"],
  cors: {
    origin: "*",
  },
});

/**
 * Making port for the app
 */
let PORT = process.env.PORT || 4001;

/**
 * Routes
 */
app.use("/api", routes);

/**
 * Connecting to mongo DB
 */
connectDb();

/**
 * Serving frontend
 */
// Set static folder
app.use(express.static("frontend/build"));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "frontend", "build", "index.html"));
});

/**
 * Making the app listen
 */
server.listen(PORT, () => {
  console.log("---- App Running on PORT `", PORT, "` -----");
});