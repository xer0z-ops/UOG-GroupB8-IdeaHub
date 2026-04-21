# UOG GroupB8 IdeaHub (Backend)

## Setup

### Create .env file and fill necessary information and credentials

```bash
cp .env.example .env
```

### Run the necessary scripts

```bash
// start redis server
./redis-setup.sh

// start main api server
./startdocker.sh

// start celery background queue worker
./startcelery.sh
```

Note : if cannot execute the scripts, please run the following command to give execute permission.

```bash
chmod +x redis-setup.sh
chmod +x startdocker.sh
chmod +x startcelery.sh
```