package com.comptapro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ComptaProApplication {

    public static void main(String[] args) {
        SpringApplication.run(ComptaProApplication.class, args);
    }
}
