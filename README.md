# ClassiSense

## AI-Powered Smart Classroom Monitoring & IoT System

ClassiSense is an intelligent classroom monitoring system that combines **Computer Vision, Artificial Intelligence, Data Science, and IoT** to monitor classroom occupancy, environmental conditions, and safety in real time.

The system uses a camera to analyze the classroom and estimate the number of students present. IoT sensors connected to an ESP32 collect environmental data such as temperature, humidity, and other relevant measurements.

The collected data is stored and analyzed to discover patterns, visualize classroom behavior, and build Machine Learning models that can make predictions and intelligent decisions.

Based on the detected conditions, the system can automatically control classroom devices such as lights and alarms.

---

## Project Objectives

The main objectives of ClassiSense are:

* Detect and count students inside a classroom using Computer Vision.
* Monitor classroom environmental conditions using IoT sensors.
* Automatically control classroom lighting based on occupancy.
* Detect dangerous situations and trigger safety alerts.
* Collect and store real-time classroom data.
* Analyze collected data using Data Science techniques.
* Visualize classroom statistics and patterns.
* Apply Machine Learning for prediction and anomaly detection.
* Demonstrate the integration between AI, Data Science, and IoT in a real-world scenario.

---

# System Overview

The system consists of four main layers:

```text
                Physical Classroom
                       |
        +--------------+--------------+
        |                             |
      Camera                       IoT Sensors
        |                             |
        v                             v
 Computer Vision                    ESP32
   + AI Models                       |
        |                             |
        +-------------+---------------+
                      |
                      v
                Data Collection
                      |
                      v
                  Database
                      |
             +--------+--------+
             |                 |
             v                 v
       Data Science        Machine Learning
             |                 |
             +--------+--------+
                      |
                      v
                Decision Layer
                      |
                      v
                    ESP32
                      |
          +-----------+-----------+
          |           |           |
        Lights      Buzzer      Alerts
```

---

# Main Features

## 1. Student Detection & Counting

A camera monitors the classroom and Computer Vision is used to detect people.

The system can determine:

* Number of students currently inside the classroom.
* Classroom occupancy percentage.
* Occupancy changes over time.
* Entry and exit activity.

Example:

```text
Students Detected: 24
Occupancy: 80%
Status: Occupied
```

---

## 2. Smart Lighting

The system uses classroom occupancy information to control the lights.

For example:

```text
Students = 0
        |
        v
Classroom Empty
        |
        v
Lights OFF
```

When students are detected:

```text
Students > 0
        |
        v
Classroom Occupied
        |
        v
Lights ON
```

A delay can be added to prevent the lights from turning off because of temporary detection errors.

---

## 3. Environmental Monitoring

The ESP32 collects environmental data using different sensors.

Possible measurements include:

* Temperature
* Humidity
* Light intensity
* Air quality / CO2
* Other environmental measurements depending on available hardware

Example:

```text
Temperature: 26°C
Humidity: 48%
Light: 350 lux
CO2: 850 ppm
```

---

## 4. Safety Monitoring

The system can monitor potentially dangerous conditions.

For example:

* Fire / flame detection
* Smoke detection
* Abnormal temperature
* Other safety-related sensor readings

When a dangerous condition is detected:

```text
Danger Detected
      |
      v
ESP32
      |
 +----+----+
 |         |
 v         v
Buzzer   Warning
```

The system can also send an alert to the software dashboard.

---

# Artificial Intelligence & Computer Vision

ClassiSense uses Computer Vision to understand the classroom environment from camera input.

### Technologies

* Python
* OpenCV
* YOLO or another suitable object detection model

OpenCV is responsible for image and video processing, while the detection model is used to identify objects such as people.

Example pipeline:

```text
Camera
   |
   v
Video Frame
   |
   v
OpenCV
   |
   v
Object Detection Model
   |
   v
Person Detection
   |
   v
People Count
```

The project may also use Computer Vision / AI models for safety detection such as fire or smoke detection, depending on the final implementation.

---

# Data Science

Data Science is an important part of ClassiSense.

The system continuously collects data from both the IoT sensors and the Computer Vision system.

Example dataset:

| Timestamp | Students | Temperature | Humidity | Light | Fire |
| --------- | -------: | ----------: | -------: | ----: | ---- |
| 09:00     |       12 |        24.1 |       45 |   320 | 0    |
| 10:00     |       25 |        25.2 |       48 |   350 | 0    |
| 11:00     |       31 |        27.0 |       52 |   280 | 0    |
| 12:00     |        0 |        25.8 |       49 |   300 | 0    |

This data can be used for:

* Exploratory Data Analysis (EDA)
* Data cleaning
* Data visualization
* Correlation analysis
* Occupancy analysis
* Energy usage analysis
* Anomaly detection
* Machine Learning

---

# Machine Learning

Machine Learning can be used to make predictions based on historical classroom data.

Possible ML tasks include:

### Classroom Occupancy Prediction

Predict the expected number of students based on:

* Time
* Day
* Previous occupancy
* Temperature
* Classroom schedule
* Historical data

Example:

```text
Input:
Day       = Monday
Time      = 10:00 AM
Previous  = 22 Students

Prediction:
Expected Occupancy = 27 Students
```

### Anomaly Detection

The system can identify unusual classroom conditions.

For example:

```text
Normal Occupancy: 15 - 30 students

Detected:
58 students

Result:
Occupancy Anomaly
```

The exact Machine Learning model will depend on the collected dataset and the final project requirements.

---

# IoT System

The IoT hardware is based on an **ESP32**.

The ESP32 is responsible for:

* Reading sensor values.
* Controlling lights.
* Controlling the buzzer.
* Sending sensor data to the software system.
* Receiving commands from the backend.
* Communicating over Wi-Fi.

Possible hardware components:

### Main Controller

* ESP32 Development Board

### Sensors

Depending on the final implementation:

* DHT22 / DHT11 — Temperature & Humidity
* LDR — Light Intensity
* MQ-series sensor or suitable air-quality sensor
* Flame Sensor
* Smoke Sensor
* Additional sensors if required

### Actuators

* LED / LED Strip or small DC light
* Buzzer
* Relay Module
* Optional OLED/LCD Display

---

# Software Architecture

The project can be divided into several software components.

```text
                    Camera
                      |
                      v
             Python Computer Vision
                      |
                      v
              AI / ML Processing
                      |
                      v
                Data Processing
                      |
                      v
                  Backend API
                      |
             +--------+--------+
             |                 |
             v                 v
          Database         Dashboard
             |
             v
       Historical Data
             |
             v
       Data Science / ML
```

The ESP32 communicates with the software system through Wi-Fi using protocols such as:

* HTTP/REST
* MQTT

The final communication protocol will depend on the project implementation.

---

# Suggested Technology Stack

## Hardware

* ESP32
* DHT11 / DHT22
* LDR
* Flame Sensor
* Smoke / Air Quality Sensor
* Buzzer
* LEDs
* Relay Module
* Optional OLED/LCD
* Camera / Webcam

## Computer Vision & AI

* Python
* OpenCV
* YOLO
* NumPy
* Optional: PyTorch

## Data Science

* Python
* Pandas
* NumPy
* Matplotlib
* Seaborn
* Scikit-learn
* Jupyter Notebook

## Backend

* Java
* Spring Boot
* REST APIs
* PostgreSQL

## Communication

* Wi-Fi
* HTTP/REST
* MQTT

## Development Tools

* IntelliJ IDEA
* VS Code
* Arduino IDE
* Jupyter Notebook
* Git & GitHub
* Postman

---

# Data Flow

The complete system follows this process:

```text
1. Camera captures classroom video
                |
                v
2. Computer Vision detects students
                |
                v
3. ESP32 collects sensor readings
                |
                v
4. Data is sent to the backend
                |
                v
5. Data is stored in PostgreSQL
                |
                v
6. Data Science processes historical data
                |
                v
7. ML models analyze / predict conditions
                |
                v
8. System makes a decision
                |
                v
9. Command is sent to ESP32
                |
                v
10. ESP32 controls lights / buzzer / devices
```

---

# Example Scenario

### Classroom is Empty

```text
Camera:
Students = 0

ESP32:
Temperature = 25°C
Humidity = 45%

System:
Classroom = Empty

Action:
Lights = OFF
```

### Students Enter

```text
Camera:
Students = 18

System:
Classroom = Occupied

Action:
Lights = ON
```

### Dangerous Condition

```text
Fire Detection:
Detected

System:
Safety Status = DANGER

Action:
Buzzer = ON
Warning = ON
Alert = Sent
```

---

# Data Visualization

The dashboard can display real-time and historical information such as:

* Current number of students
* Classroom occupancy
* Temperature
* Humidity
* Light level
* Safety status
* Occupancy over time
* Environmental changes
* Predicted occupancy
* Detected anomalies

Example:

```text
Students Over Time

40 |             *
30 |        *    * *
20 |   *    * *  * *
10 | * *    * *
 0 +--------------------
    9   10   11   12
```

---

# Project Structure

A possible project structure:

```text
ClassiSense/
│
├── computer-vision/
│   ├── detection/
│   ├── models/
│   └── main.py
│
├── data-science/
│   ├── datasets/
│   ├── notebooks/
│   ├── preprocessing/
│   └── models/
│
├── esp32/
│   ├── sensors/
│   ├── actuators/
│   └── main/
│
├── backend/
│   └── spring-boot/
│
├── dashboard/
│
├── docs/
│
└── README.md
```

---

# Expected Results

The final system should be able to:

* Monitor classroom occupancy in real time.
* Count students using Computer Vision.
* Collect environmental IoT data.
* Automatically control classroom lighting.
* Detect dangerous conditions.
* Trigger safety alerts.
* Store historical data.
* Analyze classroom behavior using Data Science.
* Visualize collected data.
* Apply Machine Learning for prediction or anomaly detection.
* Demonstrate real-time communication between AI software and IoT hardware.

---

# Future Improvements

Possible future improvements include:

* Face recognition for automated attendance.
* More advanced occupancy prediction.
* Energy consumption prediction.
* Advanced fire and smoke detection.
* Mobile application.
* Cloud deployment.
* Multiple classroom support.
* Centralized monitoring for an entire building.
* Real-time notifications.
* More advanced Machine Learning models.

---

# Team

ClassiSense is developed as an academic project combining:

* Internet of Things (IoT)
* Computer Vision
* Artificial Intelligence
* Data Science
* Machine Learning
* Backend Development

The project is designed to demonstrate how these technologies can work together to create an intelligent and automated classroom environment.
