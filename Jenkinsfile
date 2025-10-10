pipeline {
    agent any
    
    tools {
        nodejs '18'
    }
    
    environment {
        NODE_VERSION = '18'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
                sh 'cd frontend && npm install && cd ..'
            }
        }
        
        stage('Build Frontend') {
            steps {
                sh 'npm run build:frontend'
            }
        }
        
        stage('Copy Dependencies') {
            steps {
                sh 'npm run copy:deps'
            }
        }
        
        stage('Build Linux') {
            when {
                anyOf {
                    branch 'master'
                    branch 'main'
                    tag pattern: "v.*", comparator: "REGEXP"
                }
            }
            steps {
                sh 'npm run rebuild:linux'
                sh 'npx --yes electron-builder --linux --publish=never'
            }
            post {
                success {
                    archiveArtifacts artifacts: 'dist/SafeWheel-*.AppImage', fingerprint: true
                }
            }
        }
        
        stage('Build Windows') {
            when {
                anyOf {
                    branch 'master'
                    branch 'main'
                    tag pattern: "v.*", comparator: "REGEXP"
                }
            }
            steps {
                sh 'npm run rebuild:win'
                sh 'npx --yes electron-builder --win --config.win.target=dir --publish=never'
                sh 'cd dist/win-unpacked && zip -r ../../SafeWheel-Windows.zip . && cd ../..'
            }
            post {
                success {
                    archiveArtifacts artifacts: 'SafeWheel-Windows.zip', fingerprint: true
                }
            }
        }
        
        
        stage('Create Release') {
            when {
                tag pattern: "v.*", comparator: "REGEXP"
            }
            steps {
                script {
                    def tagName = env.TAG_NAME ?: env.BRANCH_NAME
                    def releaseName = "SafeWheel ${tagName}"
                    
                    // Создаем релиз через GitHub API или другую систему
                    sh """
                        echo "Creating release: ${releaseName}"
                        echo "Tag: ${tagName}"
                        echo "Artifacts available:"
                        ls -la dist/
                    """
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            echo 'Build completed successfully!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
