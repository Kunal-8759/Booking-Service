const express = require('express');

const { ServerConfig } = require('./config');
const apiRouter =require('./routes');
const CRON  = require('./utils/common/cron.jobs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api',apiRouter);

app.listen(ServerConfig.PORT, () => {
    console.log(`Successfully started the server on PORT : ${ServerConfig.PORT}`);
    CRON();
});
