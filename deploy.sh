docker build -t dayhunter/multi-client:latest -t dayhunter/multi-client:$SHA -f ./client/Dockerfile ./client
docker build -t dayhunter/multi-server:latest -t dayhunter/multi-server:$SHA -f ./server/Dockerfile ./server
docker build -t dayhunter/multi-worker:latest -t dayhunter/multi-worker:$SHA -f ./worker/Dockerfile ./worker
docker push dayhunter/multi-client:latest
docker push dayhunter/multi-server:latest
docker push dayhunter/multi-worker:latest

docker push dayhunter/multi-client:$SHA
docker push dayhunter/multi-server:$SHA
docker push dayhunter/multi-worker:$SHA

kubectl apply -f k8s
kubectl set image deployments/server-deployment server=dayhunter/multi-server:$SHA
kubectl set image deployments/client-deployment client=dayhunter/multi-client:$SHA
kubectl set image deployments/worker-deployment worker=dayhunter/multi-worker:$SHA