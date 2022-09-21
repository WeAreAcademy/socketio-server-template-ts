import * as cors from "cors";
import * as express from "express";
import * as http from "http";
import { Server, Socket } from "socket.io";

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const storyWords: string[] = [];

io.on("connection", (s: Socket) => {
    console.log("Got a connection.  Registering handlers...");

    //useful for debugging
    s.onAny((tag: string, ...otherArgs) =>
        console.log("Received: ", tag, otherArgs, "(generic handler)")
    );

    //register to handle specific messages...
    s.on("addWord", (newWord: string) => {
        storyWords.push(newWord);
        //tell everyone, including socket s
        io.emit("storyUpdate", storyWords);
    });

    s.on("clearStory", (newWord: string) => {
        storyWords.length = 0; //reset array to [], even though const.
        //Tell everyone, including socket s
        io.emit("storyUpdate", storyWords);
    });

    s.on("sayToOthers", (msg: string) => {
        //Sends to all connected, EXCEPT not to this socket, s
        s.broadcast.emit("chat", { from: s.id, msg: msg });
    });
});

//Send something every 20 seconds to all connected
setInterval(() => {
    io.emit("time", new Date());
}, 20000);

//express routes - optional
app.get("/", (req, res) => {
    res.send("try POSTing {word: 'blah'} to /storyWords");
});

app.post("/storyWords", (req, res) => {
    const word = req.body.word;
    storyWords.push(word);
    res.status(201).json({ outcome: "success", storyWords: storyWords });
    io.emit("storyUpdate", storyWords);
});

const port = process.env.PORT ?? 4000;
//important: call listen on the *server*, not the `app` directly.
server.listen(port, () => {
    console.log("socketio and express server listening on *:" + port);
});
