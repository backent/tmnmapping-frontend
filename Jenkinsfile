pipeline {
    agent any

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

        // ── 2. Guard – skip builds triggered by the version-bump commit ───────
        stage('Check Skip CI') {
            steps {
                script {
                    def commitMsg = sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()
                    if (commitMsg.contains('[skip ci]')) {
                        currentBuild.result = 'NOT_BUILT'
                        error('Version-bump commit detected – skipping pipeline.')
                    }
                }
            }
        }

        // ── 3. Read Version ───────────────────────────────────────────────────
        stage('Read Version') {
            steps {
                script {
                    env.APP_VERSION = readFile('VERSION').trim()
                    echo "Building version: ${env.APP_VERSION}"
                }
            }
        }

        // ── 4. Build & Type Check (parallel) ──────────────────────────────────
        stage('Build & Test') {
            parallel {

                stage('Build Image') {
                    steps {
                        withCredentials([
                            string(credentialsId: 'tmn-mapping-vite-api-base-url',              variable: 'VITE_API_BASE_URL'),
                            string(credentialsId: 'tmn-mapping-vite-google-maps-api-key',       variable: 'VITE_GOOGLE_MAPS_API_KEY'),
                            string(credentialsId: 'tmn-mapping-vite-enable-marker-clustering',  variable: 'VITE_ENABLE_MARKER_CLUSTERING'),
                            string(credentialsId: 'tmn-mapping-vite-cluster-by-type',           variable: 'VITE_CLUSTER_BY_TYPE')
                        ]) {
                            sh """
                                docker build \\
                                    --build-arg VITE_API_BASE_URL=\$VITE_API_BASE_URL \\
                                    --build-arg VITE_GOOGLE_MAPS_API_KEY=\$VITE_GOOGLE_MAPS_API_KEY \\
                                    --build-arg VITE_ENABLE_MARKER_CLUSTERING=\$VITE_ENABLE_MARKER_CLUSTERING \\
                                    --build-arg VITE_CLUSTER_BY_TYPE=\$VITE_CLUSTER_BY_TYPE \\
                                    -t ${IMAGE_NAME}:${env.APP_VERSION} \\
                                    . --platform=linux/amd64
                            """
                        }
                    }
                }

                stage('Test') {
                    steps {
                        sh '''
                            docker run --rm \
                                -v "$(pwd):/app" \
                                -w /app \
                                node:20-alpine \
                                sh -c "corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile && pnpm run test"
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
                    sh "docker push ${IMAGE_NAME}:${env.APP_VERSION}"
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
                            sudo docker pull ${IMAGE_NAME}:${env.APP_VERSION} &&
                            sudo docker rm -f frontend || true &&
                            sudo docker run -dp 127.0.0.1:3000:80 \\
                                --name frontend \\
                                --network global-network \\
                                --restart unless-stopped \\
                                ${IMAGE_NAME}:${env.APP_VERSION}
                        '
                    """
                }
            }
        }

        // ── 5. Tag Release & Bump Minor Version ───────────────────────────────
        stage('Tag & Bump Version') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'tmn-mapping-github-cred',
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_TOKEN'
                )]) {
                    script {
                        def currentVersion = env.APP_VERSION

                        // Calculate next minor version  (major.minor+1.0)
                        def parts   = currentVersion.tokenize('.')
                        def major   = parts[0]
                        def minor   = parts[1].toInteger() + 1
                        def nextVersion = "${major}.${minor}.0"

                        // Detect current branch (works for both regular and multibranch jobs)
                        def branch = env.BRANCH_NAME ?: sh(
                            script: 'git rev-parse --abbrev-ref HEAD',
                            returnStdout: true
                        ).trim()

                        // Build authenticated remote URL (handles both HTTPS and SSH origins)
                        sh """
                            ORIGIN_URL=\$(git config --get remote.origin.url)

                            # Normalise SSH → HTTPS  (git@github.com:owner/repo.git  →  https://github.com/owner/repo.git)
                            if echo "\$ORIGIN_URL" | grep -qE '^git@'; then
                                ORIGIN_URL=\$(echo "\$ORIGIN_URL" | sed -E 's|git@([^:]+):|https://\\1/|')
                            fi

                            # Strip any existing credentials embedded in the URL
                            ORIGIN_URL=\$(echo "\$ORIGIN_URL" | sed -E 's|https://[^@]+@|https://|')

                            AUTH_URL=\$(echo "\$ORIGIN_URL" | sed "s|https://|https://\${GIT_USER}:\${GIT_TOKEN}@|")

                            git config user.email "jenkins@ci.local"
                            git config user.name  "Jenkins CI"

                            # Create annotated git tag for the version we just deployed
                            git tag -a "v${currentVersion}" -m "Release v${currentVersion}"

                            # Write the next version and commit with [skip ci] to prevent a loop
                            echo "${nextVersion}" > VERSION
                            git add VERSION
                            git commit -m "ci: bump version to ${nextVersion} [skip ci]"

                            # Push the version-bump commit and the new tag
                            git push "\$AUTH_URL" HEAD:${branch}
                            git push "\$AUTH_URL" "v${currentVersion}"
                        """

                        echo "Tagged v${currentVersion} and bumped VERSION to ${nextVersion}"
                    }
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
            echo "Deployed ${IMAGE_NAME}:${env.APP_VERSION} successfully."
        }
        failure {
            echo "Pipeline failed. Image ${IMAGE_NAME}:${env.APP_VERSION} was NOT deployed."
        }
    }
}
