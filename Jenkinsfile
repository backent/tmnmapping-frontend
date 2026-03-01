pipeline {
    agent any

    parameters {
        string(
            name: 'IMAGE_TAG',
            defaultValue: '1.7',
            description: 'Docker image tag / version to build and deploy (e.g. 1.7, 1.8)'
        )
    }

    environment {
        IMAGE_NAME  = 'backent/tmn-mapping-frontend'
        SERVER_HOST = '108.136.218.247'
        SERVER_USER = 'ubuntu'
    }

    stages {

        // ── 1. Checkout ───────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ── 2. Build & Type Check (parallel) ──────────────────────────────────
        stage('Build & Test') {
            parallel {

                stage('Build Image') {
                    steps {
                        withCredentials([
                            string(credentialsId: 'vite-api-base-url',              variable: 'VITE_API_BASE_URL'),
                            string(credentialsId: 'vite-google-maps-api-key',       variable: 'VITE_GOOGLE_MAPS_API_KEY'),
                            string(credentialsId: 'vite-enable-marker-clustering',  variable: 'VITE_ENABLE_MARKER_CLUSTERING'),
                            string(credentialsId: 'vite-cluster-by-type',           variable: 'VITE_CLUSTER_BY_TYPE')
                        ]) {
                            sh """
                                docker build \\
                                    --build-arg VITE_API_BASE_URL=\$VITE_API_BASE_URL \\
                                    --build-arg VITE_GOOGLE_MAPS_API_KEY=\$VITE_GOOGLE_MAPS_API_KEY \\
                                    --build-arg VITE_ENABLE_MARKER_CLUSTERING=\$VITE_ENABLE_MARKER_CLUSTERING \\
                                    --build-arg VITE_CLUSTER_BY_TYPE=\$VITE_CLUSTER_BY_TYPE \\
                                    -t ${IMAGE_NAME}:${params.IMAGE_TAG} \\
                                    . --platform=linux/amd64
                            """
                        }
                    }
                }

                stage('Type Check') {
                    steps {
                        sh '''
                            docker run --rm \
                                -v "$(pwd):/app" \
                                -w /app \
                                node:20-alpine \
                                sh -c "corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile && pnpm run typecheck"
                        '''
                    }
                }

            }
        }

        // ── 3. Push Image ─────────────────────────────────────────────────────
        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-backent-cred',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh "docker push ${IMAGE_NAME}:${params.IMAGE_TAG}"
                }
            }
        }

        // ── 4. Deploy to Server ───────────────────────────────────────────────
        stage('Deploy to Server') {
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'tmn-app-ssh-key',
                    keyFileVariable: 'SSH_KEY_FILE'
                )]) {
                    sh """
                        ssh -i \$SSH_KEY_FILE -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} '
                            sudo docker pull ${IMAGE_NAME}:${params.IMAGE_TAG} &&
                            sudo docker rm -f frontend || true &&
                            sudo docker run -dp 127.0.0.1:3000:80 \\
                                --name frontend \\
                                --network global-network \\
                                --restart unless-stopped \\
                                ${IMAGE_NAME}:${params.IMAGE_TAG}
                        '
                    """
                }
            }
        }

    }

    // ── Post-pipeline ─────────────────────────────────────────────────────────
    post {
        always {
            sh 'docker logout || true'
        }
        success {
            echo "Deployed ${IMAGE_NAME}:${params.IMAGE_TAG} successfully."
        }
        failure {
            echo "Pipeline failed. Image ${IMAGE_NAME}:${params.IMAGE_TAG} was NOT deployed."
        }
    }
}
