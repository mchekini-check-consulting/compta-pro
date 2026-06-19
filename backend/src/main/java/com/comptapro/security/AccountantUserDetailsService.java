package com.comptapro.security;

import com.comptapro.repository.AccountantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccountantUserDetailsService implements UserDetailsService {

    private final AccountantRepository accountantRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return accountantRepository.findByEmail(email)
                .map(AccountantUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouve: " + email));
    }
}
