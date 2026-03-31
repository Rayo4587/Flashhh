#!/bin/bash

# Comprehensive Production-Ready Automation Script

# Color codes for progress tracking
SUCCESS="\033[0;32m"  # Green
WARNING="\033[0;33m"  # Yellow
ERROR="\033[0;31m"    # Red
NC="\033[0m"          # No Color

# Function to check Node.js installation
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${ERROR}Node.js is not installed. Please install it before running the script.${NC}"
        exit 1
    else
        echo -e "${SUCCESS}Node.js is installed.${NC}"
    fi
}

# Function to install FFmpeg
install_ffmpeg() {
    echo -e "${WARNING}Installing FFmpeg...${NC}"
    if [[ $(uname) == "Darwin" ]]; then
        brew install ffmpeg
    elif [[ $(uname) == "Linux" ]]; then
        sudo apt-get install ffmpeg -y
    else
        echo -e "${ERROR}Unsupported operating system.${NC}"
        exit 1
    fi
    echo -e "${SUCCESS}FFmpeg installed successfully.${NC}"
}

# Function to check for Google Chrome installation
check_chrome() {
    if ! command -v google-chrome &> /dev/null; then
        echo -e "${ERROR}Google Chrome is not installed. Please install it before running the script.${NC}"
        exit 1
    else
        echo -e "${SUCCESS}Google Chrome is installed.${NC}"
    fi
}

# Function to install npm dependencies
install_dependencies() {
    echo -e "${WARNING}Installing npm dependencies...${NC}"
    npm install
    echo -e "${SUCCESS}npm dependencies installed successfully.${NC}"
}

# Function to validate video source
validate_video_source() {
    if [[ ! -f "video_source.mp4" ]]; then
        echo -e "${ERROR}Video source not found! Please check the file path.${NC}"
        exit 1
    else
        echo -e "${SUCCESS}Video source validated.${NC}"
    fi
}

# Function for high-quality rendering
render_video() {
    echo -e "${WARNING}Rendering video...${NC}"
    ffmpeg -i video_source.mp4 -c:v libx264 -preset slow -crf 18 output_video.mp4
    if [[ $? -ne 0 ]]; then
        echo -e "${ERROR}Rendering failed! Please check the logs.${NC}"
        exit 1
    else
        echo -e "${SUCCESS}Video rendered successfully. Output: output_video.mp4${NC}"
    fi
}

# Function to verify output
verify_output() {
    if [[ -f "output_video.mp4" ]]; then
        echo -e "${SUCCESS}Output video verified successfully.${NC}"
    else
        echo -e "${ERROR}Output video not found!${NC}"
        exit 1
    fi
}

# Main script execution
check_node
install_ffmpeg
check_chrome
install_dependencies
validate_video_source
render_video
verify_output
