package com.reliablepay.mockbank.repository;

import com.reliablepay.mockbank.model.ChaosConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChaosConfigRepository extends JpaRepository<ChaosConfig, Integer> {
}
