## How to install
1. Download the jetbrains WebStorm IDE.
2. Login your github account.
2. Choose "get from VCS" and clone the repository from the github.
3. "control+," to open the settings,set the node.js and choose the npm(it should be set up by default, if not 
go to:[nodejs](https://nodejs.org/en/download）
4. open the terminal(built in) and run the command `npm install` to install the dependencies.
5. run the command `npm start` to start the server.

## Structure
public: contains the static files.
src: contains the source code.
```
/webapp
├── /src
│   ├── /public             # Static files directory
│   │   ├── /css            # Stores CSS files
│   │   │   └── style.css
│   │   ├── /js             # Stores JavaScript files
│   │   │   └── script.js
│   │   ├── /images         # Stores image files
│   │   │   └── logo.jpg
│   │   ├── /icons         
│   │   │   └── logo.svg
│   │   └── /pages     # HTML file
│   │       └── homePage.html
│   ├── /routes             # Routes directory
│   │   └── appRoutes.js    # Route configuration file
│   ├── /models             # Database models and schemas
│   │   └── userModel.js    # Example schema or model for a User
│   ├── /database           # Database connection and configuration
│   │   └── db.js           # Database connection logic
│   ├── app.js              # Express application configuration
│   └── server.js           # Main entry point, starts the server
├── package.json            # Project dependencies and metadata
├── package-lock.json       # Locked dependency versions
├── .env                    # Environment variables configuration
└── README.md               # Project documentation
```