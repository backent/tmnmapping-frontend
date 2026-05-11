pipeline {
    agent any

    // ── Build Parameters ──────────────────────────────────────────────────────
    // DEPLOY_TYPE:
    //   NORMAL        – full pipeline: build, test, push, deploy, tag & bump
    //   VERSION_ONLY  – skip build/test/push/bump; just (re)deploy an already
    //                   pushed image tag onto the server. Useful for rollbacks
    //                   or redeploying a previously-built version.
    // TARGET_VERSION:
    //   Required when DEPLOY_TYPE = VERSION_ONLY (e.g. "1.4.0"). Ignored for
    //   NORMAL deployments, which read the version from the VERSION file.
    parameters {
        choice(
            name: 'DEPLOY_TYPE',
            choices: ['NORMAL', 'VERSION_ONLY'],
            description: 'NORMAL = full build & deploy. VERSION_ONLY = only switch the server to TARGET_VERSION (no build/push/bump).'
        )
        string(
            name: 'TARGET_VERSION',
            defaultValue: '',
            description: 'Image tag to deploy when DEPLOY_TYPE = VERSION_ONLY (e.g. 1.4.0). Leave empty for NORMAL deployments.'
        )
    }

    stages {

        // ── 1. Checkout ───────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ── 2. Guard – skip builds triggered by the version-bump commit ───────
        //     Only relevant for NORMAL deployments; VERSION_ONLY runs are
        //     manually triggered so we never want to skip them.
        stage('Check Skip CI') {
            when { expression { params.DEPLOY_TYPE == 'NORMAL' } }
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

        // ── 3. Read Version & Config ──────────────────────────────────────────
        stage('Read Version & Config') {
            steps {
                script {
                    if (params.DEPLOY_TYPE == 'VERSION_ONLY') {
                        if (!params.TARGET_VERSION?.trim()) {
                            error('VERSION_ONLY deployment requires a non-empty TARGET_VERSION parameter.')
                        }
                        env.APP_VERSION = params.TARGET_VERSION.trim()
                        echo "Version-only deployment: ${env.APP_VERSION}"
                    } else {
                        env.APP_VERSION = readFile('VERSION').trim()
                        echo "Building version: ${env.APP_VERSION}"
                    }
                    // Credential ID: "tmn-app-frontend-image-name" (Secret text) – Docker image repo (e.g. account/image-name)
                    withCredentials([string(credentialsId: 'tmn-app-frontend-image-name', variable: 'IMG')]) {
                        env.IMAGE_NAME = IMG
                    }
                }
            }
        }

        // ── 4. Build & Type Check (parallel) ──────────────────────────────────
        stage('Build & Test') {
            when { expression { params.DEPLOY_TYPE == 'NORMAL' } }
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
                                    -t ${env.IMAGE_NAME}:${env.APP_VERSION} \\
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
                                sh -c "corepack enable && corepack prepare pnpm@10.20.0 --activate && pnpm install --frozen-lockfile && pnpm run test"
                        '''
                    }
                }

            }
        }

        // ── 5. Push Image ─────────────────────────────────────────────────────
        stage('Push Image') {
            when { expression { params.DEPLOY_TYPE == 'NORMAL' } }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-backent-cred',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh "docker push ${env.IMAGE_NAME}:${env.APP_VERSION}"
                }
            }
        }

        // ── 6. Deploy to Server ───────────────────────────────────────────────
        stage('Deploy to Server') {
            steps {
                // Credential IDs (all "Secret text"):
                //   tmn-app-server-host  – SSH server address (e.g. 108.136.218.247)
                //   tmn-app-server-user  – SSH username       (e.g. ubuntu)
                //   tmn-app-server-port  – SSH port           (e.g. 22)
                // Credential ID: "tmn-app-ssh-key"
                //   Type        : SSH Username with private key
                //   Private key : contents of tmn-app-key.pem
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'tmn-app-ssh-key', keyFileVariable: 'SSH_KEY_FILE'),
                    string(credentialsId: 'tmn-app-server-host', variable: 'SERVER_HOST'),
                    string(credentialsId: 'tmn-app-server-user', variable: 'SERVER_USER'),
                    string(credentialsId: 'tmn-app-server-port', variable: 'SERVER_PORT')
                ]) {
                    sh """
                        ssh -i \$SSH_KEY_FILE -o StrictHostKeyChecking=no -p \$SERVER_PORT \$SERVER_USER@\$SERVER_HOST '
                            sudo docker pull ${env.IMAGE_NAME}:${env.APP_VERSION} &&
                            sudo docker rm -f frontend || true &&
                            sudo docker run -dp 127.0.0.1:3000:80 \\
                                --name frontend \\
                                --network global-network \\
                                --restart unless-stopped \\
                                ${env.IMAGE_NAME}:${env.APP_VERSION}
                        '
                    """
                }
            }
        }

        // ── 7. Tag Release & Bump Minor Version ───────────────────────────────
        stage('Tag & Bump Version') {
            when { expression { params.DEPLOY_TYPE == 'NORMAL' } }
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
            echo "Deployed ${env.IMAGE_NAME}:${env.APP_VERSION} successfully (${params.DEPLOY_TYPE})."
        }
        failure {
            echo "Pipeline failed. Image ${env.IMAGE_NAME}:${env.APP_VERSION} was NOT deployed."
        }
    }
}
